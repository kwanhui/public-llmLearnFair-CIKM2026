# Running the demo

How to run, host, and walk through the system.

## Hosted demo

- **Public demo URL** (no auth, side-by-side comparison enabled): https://llmlearnfair.vercel.app/demo
- **Cohort student URL** (after a tutor invites): https://llmlearnfair.vercel.app/join/<slug>?t=<token>
- **Tutor login URL**: https://llmlearnfair.vercel.app/admin/login
- **Standalone fairness audit**: https://llmlearnfair.vercel.app/audit
- **Run it yourself**: clone, `pnpm install`, fill `.env.local`, `pnpm dev`.
- See [`deploy.md`](deploy.md) for the Vercel deploy recipe.

### Demo credentials

- **Tutor login**: email `admin`, password `demo1234`.
- **Students**: no login; they join through a one-time invite link the tutor
  generates from a cohort's Overview tab.

> Shared demo credential, synthetic data only. Rotate it with
> `pnpm change-admin-password` for your own deployment.

## Walkthrough

The first run after the demo has been idle can be slow; send one throwaway turn
(or hit `/audit` once) to warm the serverless functions first.

### 1. Public demo: `/demo` (the headline)

1. Open `/demo`: two columns, **Unrestricted GPT** vs **SAGE** (guardrailed +
   audited), with the SRL sidebar on the left.
2. Send a direct-answer prompt, e.g. *"Just give me the formula for
   R-squared."* The left column answers immediately; SAGE instead fires the
   **WriteApproachFirst** scaffold ("plan your approach") and the Forethought
   phase highlights in the sidebar.
3. Ask a fuller question to pass the gate (a short question is held at the
   ~160-character approach threshold), e.g. the multicollinearity question. SAGE
   answers and an inline **audit badge** appears under the reply; expand it to
   see explanation-depth and jargon bars across learner profiles.
4. Below the chat, change a **counterfactual swap** dropdown (e.g. Education)
   and click *Re-run last turn*; a tailored variant appears under the answer.

### 2. Tutor admin

1. Go to `/admin/login` and sign in (`admin` / `demo1234`).
2. **Create a cohort**, then **Generate invite link** on its Overview tab.
3. Open the **Analytics** tab: turn volume, active students, scaffold pass rate,
   audit flag rate, per-attribute charts, the students table, and CSV export.

### 3. Student

1. Open the invite link in a fresh browser/incognito window. It lands in the
   clean single-column tutor at `/chat` (no scenario picker or swap; those are
   reviewer/demo-only tools).
2. Send a couple of turns; the scaffolds fire and the activity shows up in the
   tutor's Analytics tab.

### 4. Standalone fairness audit: `/audit`

1. Enter a prompt, e.g. *"What does a current ratio of 1.1 tell me about
   liquidity and short-term solvency?"*
2. The auditor runs 12 counterfactual probes (4 attributes × 3 values); any
   that diverge past threshold are flagged.

### Notes

- **Reaching the audit badge needs a passing turn.** Pass the scaffold (write a
  real approach, or ask a longer question) so SAGE actually answers.
- **Flagging is genuine but stochastic** on gpt-4o-mini. The current-ratio /
  liquidity prompt flags most reliably.

## Scenarios

Bundled scenarios live under `configs/scenarios/*.yaml` and can be replayed
headlessly with `pnpm demo --scenario <name>`.

## Contents

- `deploy.md`: Vercel deployment recipe.
