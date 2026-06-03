# Vercel Deployment

One-time setup for a hosted demo URL the reviewers can hit.

Two deploy paths. Pick **A** for the easiest experience.

## Path A: GitHub integration (recommended)

This path lets Vercel auto-deploy every push to `main`, with no local CLI
required after setup.

1. Click the **Deploy with Vercel** button in the top-level [README](../README.md),
   or go to https://vercel.com/new and import the GitHub repo
   `kwanhui/public-llmLearnFair-CIKM2026`.
2. Vercel will prompt for two environment variables before the first build:
   - `OPENAI_API_KEY`: your OpenAI key (or set `LLM_PROVIDER=anthropic` and
     supply `ANTHROPIC_API_KEY` instead).
   - `PSEUDONYM_SALT`: generate with `openssl rand -hex 32` and paste.
3. Add a Postgres database in the Vercel dashboard:
   - Project → **Storage** tab → **Create Database** → **Postgres**.
   - Vercel auto-injects `POSTGRES_URL`, `POSTGRES_PRISMA_URL`,
     `POSTGRES_URL_NON_POOLING` into the project's env.
4. Trigger a redeploy (Deployments → Redeploy) so the build picks up the DB
   creds, then run migrations once locally:
   ```bash
   vercel env pull .env.local
   pnpm db:generate && pnpm db:migrate
   ```

After this, every `git push` builds a preview, and pushes to `main` deploy
to production.

## Path B: Local CLI deploy

Use this when you want to ship without a GitHub push (e.g., to test a local
branch quickly).

```bash
# 1. Install
pnpm install

# 2. Authenticate and link
vercel login
vercel link

# 3. Provision Postgres in the dashboard (Storage tab), then pull creds
vercel env pull .env.local

# 4. Add the LLM key + salt
vercel env add OPENAI_API_KEY
vercel env add PSEUDONYM_SALT      # paste output of `openssl rand -hex 32`

# 5. Run migrations
pnpm db:generate
pnpm db:migrate

# 6. Deploy a preview
vercel --prod=false
```

The preview URL is the one to put in the paper and on the demo poster.

## Region

`vercel.json` pins functions to `sin1` (Singapore) for latency parity with
the SUSS deployment context. Edit `vercel.json` if you want a different
region.

## Production

```bash
vercel --prod
```

(Or, with the GitHub integration, every push to `main` deploys to prod
automatically.)

## Cost

The CIKM demo workload (a handful of reviewer sessions over 6 weeks) sits
inside the free Vercel hobby tier and Neon free Postgres. The dominant cost
is the LLM API; expect ~US$5–15 over the review window.
