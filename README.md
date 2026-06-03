# SAGE

> The repository, npm package, and demo URL keep the original `llmLearnFair`
> name; the system is presented as **SAGE** in the paper and UI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkwanhui%2Fpublic-llmLearnFair-CIKM2026&env=OPENAI_API_KEY,PSEUDONYM_SALT,AUTH_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD_HASH&envDescription=OPENAI_API_KEY%20for%20the%20LLM%2C%20PSEUDONYM_SALT%20for%20HMAC%20learner%20hashing%2C%20AUTH_SECRET%20for%20Auth.js%2C%20ADMIN_EMAIL%20and%20ADMIN_PASSWORD_HASH%20for%20the%20single-tutor%20sign-in%20(bcrypt%20hash%20via%20pnpm%20change-admin-password)&project-name=llmlearnfair&repository-name=llmlearnfair)

**Live demo:** https://llmlearnfair.vercel.app/demo (no auth required)

SAGE (Scaffolded, Audited, Guided Education) is a guardrailed LLM tutor that
scaffolds self-regulated learning for adult learners, built as a Next.js 15 app
on Vercel. Interface-level scaffolds prompt learners to plan, paraphrase, and
attempt before the tutor answers; a counterfactual fairness audit runs as a
secondary safeguard, checking that the tutor responds consistently across
learner backgrounds. Two modes:

- **Student mode** (`/`): chat with the guardrailed tutor. Surfaces the SRL
  scaffold state, an inline fairness audit verdict per turn, and a
  counterfactual swap that lets the learner watch the tutor's response shift
  with demographic context. Optional side-by-side view compares the
  guardrailed tutor against an unrestricted LLM.
- **Tutor mode** (`/admin`): email + password sign-in, then create a cohort,
  configure scaffolds + audit + UI per cohort, generate one-time student
  invite URLs, and watch a live analytics dashboard with CSV export.

The tool wraps a commercial LLM with four components implemented under `lib/`:

1. **Intent classifier** (`lib/intent/`): labels each learner turn.
2. **Scaffold runner** (`lib/guardrails/`): three SRL state machines:
   write-your-approach-first, paraphrase-before-proceeding,
   attempt-before-reveal. Each enforces a checkpoint before the LLM responds.
3. **Counterfactual fairness audit** (`lib/audit/`): swaps demographic
   markers in the system prompt, measures explanation depth and jargon
   density divergence, fires the agentic rectifier loop on flagged turns.
4. **Pseudonymised interaction logger** (`lib/logging/`): HMAC-SHA256 hashes
   learner IDs; raw text never persisted alongside identity.

## Quick start

```bash
git clone https://github.com/kwanhui/public-llmLearnFair-CIKM2026.git
cd public-llmLearnFair-CIKM2026

pnpm install
cp .env.example .env.local   # fill OPENAI_API_KEY, PSEUDONYM_SALT (required)
                              # AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, POSTGRES_URL (for tutor mode)
pnpm dev                      # http://localhost:3000
```

The student `/` and `/demo` routes work with just `OPENAI_API_KEY` and
`PSEUDONYM_SALT`. Tutor mode (`/admin`) additionally needs Auth.js
(`AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`) + Postgres. See
[`demo/deploy.md`](demo/deploy.md).

## Run the scripted demo

```bash
pnpm demo --scenario regression-interpretation
```

## Run an offline fairness audit

```bash
pnpm audit -- --prompts configs/scenarios/audit-prompts.yaml \
              --audit-config configs/audit/business-ed.yaml
# Writes results/audit-YYYY-MM-DD.csv
```

## Deploy your own instance

Clicking the **Deploy with Vercel** button at the top of this README clones this
repository into your own Vercel account and stands up an independent instance.
Vercel prompts for the required environment variables before the first build:

- `OPENAI_API_KEY` (your own key) and `PSEUDONYM_SALT` (HMAC salt) for the
  student `/` and `/demo` routes;
- `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH` for the single-tutor
  admin login (generate the hash with `pnpm change-admin-password`).

Add a Vercel Postgres (or Neon) database for tutor mode, then redeploy so the
build picks up the connection string. After that, every push to `main` in your
copy auto-deploys to your own production URL.

The result is entirely yours: your keys, your database, your Vercel project. It
is independent of any demo the authors host (the authors' hosted demo runs from
a separate, private deployment, so deploying from this repo does not touch it).
For manual or local CLI deploy, see [`demo/deploy.md`](demo/deploy.md).

## Development

```bash
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest unit
pnpm e2e          # playwright e2e (starts dev server)
pnpm db:generate  # drizzle migration after schema edits
pnpm db:migrate   # apply migrations to POSTGRES_URL
```

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the four-component
runtime and the tutor/student split. Drizzle schema lives in
`lib/db/schema.ts`; cohort config schema (Zod-validated) is in
`lib/cohort/defaults.ts`.

## Citation

The companion demo paper is currently under review (venue to be confirmed).
Citation metadata is in [`CITATION.cff`](CITATION.cff); a BibTeX entry:

```bibtex
@inproceedings{Lim2026SAGE,
  title     = {SAGE: A Guardrailed LLM Tutoring System with Scaffolded Self-Regulated Learning for Adult Education},
  author    = {Lim, Kwan Hui and Ren, Jing and Zhang, Yimiao and Chye, Stefanie and Wong, Amy},
  year      = {2026},
  booktitle = {To be confirmed (under review)},
  note      = {Submitted to the CIKM 2026 Demo Track; venue to be confirmed}
}
```

The full reference will be updated here once the paper is accepted.

## Security note

The single-tutor sign-in (one account, a bcrypt-hashed password set via
`pnpm change-admin-password`) is deliberately minimal: it exists to gate tutor
mode for this system demonstration, not as production-grade authentication. A
real deployment should add proper user accounts, password and session policies,
rate limiting, and a spend cap on the model API.

## License

See [LICENSE](LICENSE).
