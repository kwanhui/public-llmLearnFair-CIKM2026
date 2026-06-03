# Architecture

llmLearnFair is a Next.js 15 (App Router) app on Vercel. It splits into two
runtime modes (student and tutor) over a shared Postgres database (Vercel
Postgres / Neon), with one tutor → many cohorts → many pseudonymous students.

```
   tutor ──/admin/login──► Auth.js (Credentials provider, JWT session)
                                  │
                                  ▼
            /admin/cohorts/[id]/{config, students, analytics}
                                  │ writes cohort configJson (Postgres)
   student ──invite URL──► /join/[slug] ──cookie──┐
                                                  ▼
                                  components/chat/chat-client.tsx
                                                  │
        ┌─────────────────────────────────────────┼──────────────────────────────┐
        ▼                                          ▼                               ▼
  /api/chat/unrestricted                     POST /api/chat                  /api/chat/swap
  (plain LLM, no gate, no audit)         one synchronous turn:          (counterfactual re-run)

  Inside POST /api/chat, in order, before the reply is returned:
    1. classify intent ............ lib/intent/classifier.ts
    2. resolve cohort + config .... lib/cohort/resolve.ts (cookie)
    3. scaffold gate .............. lib/guardrails/scaffold.ts
                                    └─ if held: return the scaffold prompt and stop (no LLM call)
    4. draft reply ................ lib/llm/client.ts (Vercel AI SDK)
    5. fairness audit (INLINE) .... lib/audit/auditor.ts (per-attribute probes run in parallel)
    6. rectify if flagged ......... lib/audit/rectifier.ts (regenerates and replaces the draft)
    7. log turn + probes .......... lib/logging/logger.ts ──► Postgres (interactions, audit_runs)

  returns { rectified reply, audit verdict } ──► ✓/⚠ badge rendered under the reply

   Standalone audit (not part of a chat turn):
     /audit ──► POST /api/audit ──► lib/audit/auditor.ts (same probes)
```

## Roles

### Tutor
Creates and configures cohorts, generates one-time student invite URLs, and
reads analytics. Authenticated via Auth.js v5 with a Credentials provider
(email + bcrypt-hashed password). A single fixed admin identity owns every
cohort; credentials come from `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`. Sessions
use a JWT strategy (the Credentials provider does not support DB sessions).

Routes (gated by `middleware.ts`):
- `/admin/login`: email + password sign-in
- `/admin`: cohort list
- `/admin/cohorts`: create
- `/admin/cohorts/[id]` (overview) → `/config`, `/students`, `/analytics` (tab nav)
- `/admin/scenarios`: read-only scenario library

### Student
Pseudonymous. No email collected. Joins via a one-time invite URL containing
a token; on first visit a `students` row + `student_sessions` cookie are
created. The cookie carries no PII, only an opaque token.

Routes:
- `/join/[slug]?t=<token>`: accept invite, set cookie, redirect to `/`
- `/`: chat UI (cohort-aware)
- `/audit`: standalone audit panel (legacy)

### Public demo
- `/demo`: same chat UI, hard-coded config with side-by-side enabled, no
  cohort, no DB writes. Used in the paper PDF and the Deploy-with-Vercel
  button landing.

## Per-cohort configuration

Each cohort owns a JSON config (`cohorts.configJson`) validated by
`CohortConfigSchema` in `lib/cohort/defaults.ts`:

```ts
{
  scaffolds: [
    { name, enabled, params: { minChars | minOverlapRatio } },  // 3 entries
  ],
  audit: {
    enabled, attributes: [...], flagThreshold, rectifier: { enabled, maxRetries }
  },
  llm: { provider, model, temperature },
  scenarios: { allowed: [...] },
  ui: { sideBySide, counterfactualSwap, scenarioPicker },
}
```

`lib/cohort/resolve.ts` reads the student cookie at request time, looks up
the cohort, parses the config (falling back to `DEFAULT_COHORT_CONFIG` if
malformed), and hands it to API routes. The chat route uses it to:
- build the scaffold runner (`lib/guardrails/`)
- pick which audit attributes to run (`lib/audit/probes.ts`)
- decide whether to render side-by-side (passed back to the client)

## Components on every student turn

### 1. IntentClassifier (`lib/intent/classifier.ts`)
LLM-as-classifier with `generateObject` + Zod enum schema (4 labels:
`direct_answer`, `conceptual`, `clarification`, `meta`). Drives scaffold
selection.

### 2. ScaffoldRunner (`lib/guardrails/`)
Three state machines:
- `WriteApproachFirst`: fires on `direct_answer`; holds LLM response until
  the learner writes ≥`minChars` of their own approach.
- `ParaphraseBeforeProceed`: fires on `direct_answer` or `conceptual` after
  the first turn; requires token-overlap ratio ≥ `minOverlapRatio` between
  the learner's next message and the previous tutor response.
- `AttemptBeforeReveal`: fires on `conceptual`; requires a guess before the
  full explanation.

### 3. FairnessAuditor (`lib/audit/`)
Counterfactual probe generator + response-divergence metrics
(`explanationDepth`, `jargonDensity`, `followUpCount` in `metrics.ts`)
+ agentic rectifier loop (`rectifier.ts`, adapted from RALLM-POI).

The audit and rectifier run inline in `/api/chat`, before the reply is
returned. A flagged turn is regenerated with a fairness-correction prefix and
the corrected text replaces the original, so the learner only ever sees the
rectified response. The per-attribute probes run in parallel
(`FairnessAuditor.runOnce`), so this adds one bounded round of model calls
rather than a per-probe penalty. The inline audit verdict is attached to the
chat response and rendered as a ✓/⚠ badge under the reply.

### 4. InteractionLogger (`lib/logging/`)
Drizzle writes one row per turn to `interactions` (cohort + student FK,
intent, scaffold state, scaffold-passed flag, audit-flagged flag, token
counts). One row per probe to `audit_runs` (attribute, value, depth, jargon,
flagged). Both functions are no-ops when `cohortId` is null (anonymous /demo)
and swallow DB errors so an unprovisioned Postgres never breaks chat.

`lib/logging/hmac.ts` HMAC-SHA256-hashes learner IDs with `PSEUDONYM_SALT`;
raw text is never persisted alongside identity.

## Analytics queries

`lib/analytics/queries.ts` aggregates by `cohortId` (indexed) and rolling 7-day
window from `lib/analytics/windows.ts`. All queries pre-aggregate by day in
SQL via `date_trunc`; there is no client-side aggregation. Tutor sees only their own
cohorts (enforced via `and(eq(cohorts.id, …), eq(cohorts.tutorId, …))`).

## App Router surfaces (full)

| Path | Auth | Purpose |
|---|---|---|
| `/` | optional cohort cookie | Chat UI (cohort-aware) |
| `/demo` | none | Public demo (side-by-side forced on, no DB writes) |
| `/audit` | none | Standalone audit panel |
| `/join/[slug]` | none | Accept cohort invite, set cookie |
| `/admin/login` | none | Email + password sign-in form |
| `/admin` | tutor | Cohort list |
| `/admin/cohorts` | tutor | Create cohort |
| `/admin/cohorts/[id]` | tutor + ownership | Overview tab (invite generator, students summary) |
| `/admin/cohorts/[id]/config` | tutor + ownership | Configuration editor (react-hook-form + Zod) |
| `/admin/cohorts/[id]/students` | tutor + ownership | Pseudonymous student list |
| `/admin/cohorts/[id]/analytics` | tutor + ownership | Charts + CSV export |
| `/admin/scenarios` | tutor | Scenario library |
| `/api/chat` | optional cohort | Guardrailed LLM turn + intent + scaffold; logs interactions |
| `/api/chat/swap` | optional cohort | Counterfactual re-run with custom profile |
| `/api/chat/unrestricted` | optional cohort | Bare LLM passthrough (side-by-side left column) |
| `/api/audit` | optional cohort | Counterfactual audit on a base prompt; logs audit_runs |
| `/api/scenario/[id]` | none | Load scenario YAML |
| `/api/cohort/me` | optional cohort | Return resolved cohort + config |
| `/api/admin/cohorts/[id]` | tutor + ownership | PATCH to update configJson |
| `/api/admin/cohorts/[id]/export` | tutor + ownership | CSV download |
| `/api/auth/[...nextauth]` | none | Auth.js handlers |
