# Strategix — Algorithmic Strategy Marketplace

Phase 1 of the real (non-prototype) build: authentication, database, and a
live strategy catalog. See `../ProtoType` in the parent directory for the
original static click-through prototype this is replacing, screen by screen.

## Live deployment

- **Production:** https://webapp-earn16.vercel.app
- **Vercel project:** `earn16/webapp`
- Deploys are currently manual via the Vercel CLI (no CI auto-deploy on push yet — see "Deploying" below).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Supabase** — Postgres database + Auth (email/password; MFA available, not yet wired into the UI)
- **Drizzle ORM** + `drizzle-kit` for schema migrations
- Hosted on **Vercel** (free/Hobby tier)

## Project structure

```
src/
  app/
    login/                  Auth: sign up / log in
    strategies/              Strategy Grid (real DB data, live search)
    strategies/[slug]/       Strategy Detail (stats, performance chart, "How it works")
    proxy.ts                 Route guard — redirects unauthenticated users to /login
  components/nav.tsx         Shared header/nav across authenticated pages
  db/
    schema.ts                Drizzle schema: profiles, strategies, subscriptions
    seed.ts                  Seeds the 6 sample strategies
    sql/profile-trigger.sql  Auto-creates a profiles row on signup (Supabase trigger)
  lib/supabase/              Browser/server/middleware Supabase clients
drizzle/                     Generated SQL migrations (versioned, checked in)
```

## Environment variables

Required in `.env.local` for local dev, and in the Vercel project's
Environment Variables (already set for Production/Preview/Development):

| Name | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `DATABASE_URL` | Supabase → Project Settings → Database → **Connection pooler** string (not the direct connection string — see note below) |

`.env.local` is git-ignored; none of these values are committed.

> **Note on `DATABASE_URL`:** use the *pooler* connection string
> (`aws-0-<region>.pooler.supabase.com:6543`), not the direct
> `db.<project-ref>.supabase.co` host — the direct host resolves via IPv6
> only on many networks and will fail with `ENOTFOUND`.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

## Database

```bash
# Generate a migration after changing src/db/schema.ts
node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs generate

# Apply migrations
node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs migrate

# Re-seed sample strategies (safe to re-run — upserts by slug)
node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs src/db/seed.ts
```

`auth.users` is Supabase's own table, referenced (not created) by our
migrations — if you ever regenerate a migration and see
`CREATE TABLE "auth"."users"` in the output, delete that block before
applying it.

## Deploying

Deploys are manual right now, via the Vercel CLI:

```bash
npx vercel deploy --prod
```

Environment variables are already configured on the Vercel project across
Production, Preview, and Development. If you add a new env var locally,
also add it to Vercel (`vercel env add <NAME> <environment>`) and redeploy.

## Roadmap

This is Phase 1 of an 8-phase build plan (auth + catalog → payments → broker
connectors → execution engine → real-time dashboard → account/trust layer →
multi-broker hardening → pilot). Phase 1 covers everything in this repo so
far; Phase 2 (payments/subscriptions) is next.
