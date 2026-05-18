@AGENTS.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Sealed-bid listings marketplace. Sellers create listings with a closing time; buyers submit sealed bids.

- **App**: Next.js 16 App Router + TypeScript, port 3000
- **Auth**: NextAuth v4 — credentials provider (email + password), JWT session
- **DB**: PostgreSQL via Prisma 7 + `@prisma/adapter-pg`
- **Styles**: Tailwind CSS v4
- **Deploy**: Vercel

## Development Commands

```bash
npm run dev              # dev server (port 3000)
npm run build            # prisma generate + next build
npm run test             # jest (API route tests only)
npm run lint             # eslint
npx prisma migrate dev   # run migrations (dev)
npx prisma db push       # push schema without migration history
```

## Environment Setup

```
DATABASE_URL        # PostgreSQL connection string
NEXTAUTH_SECRET     # generate: openssl rand -base64 32
NEXTAUTH_URL        # base URL; omit on Vercel (auto-set via VERCEL_URL)
```

## Architecture

**Request flow**
Browser → Next.js App Router (3000) → API route handlers → Prisma → PostgreSQL

**Auth flow**
`/auth/signup` → POST `/api/auth/signup` (bcrypt hash, create User) → redirect to sign-in
`/auth/signin` → NextAuth credentials → bcrypt compare → JWT issued
`session.user` carries `id` + `username` — augmented in `types/next-auth.d.ts`

**Directory structure**
```
app/
  api/auth/signup/         # POST: create user
  api/auth/[...nextauth]/  # NextAuth catch-all
  api/listings/            # GET (all active), POST (create, auth required)
  api/listings/[id]/       # GET, PATCH, DELETE by id
  auth/signin|signup/      # Auth pages
  listings/[id]/           # Listing detail + bid UI
  components/              # Navbar, CancelButton, CountdownTimer
lib/
  auth.ts        # NextAuth config (authOptions)
  prisma.ts      # Prisma singleton (pg.Pool adapter)
  base-url.ts    # Server-side URL helper (Vercel-aware)
prisma/schema.prisma       # User, Listing models
types/next-auth.d.ts       # Session type augmentation (id, username)
__tests__/api/             # API route tests only — no component tests
```

## Key Conventions

- **Prisma**: always import from `@/lib/prisma`; never instantiate directly — uses `pg.Pool` adapter
- **Session**: use `getServerSession(authOptions)` (NextAuth v4); not `auth()` (that's v5)
- **Session username**: `session.user.username` — mapped via `user.name` in JWT callback in `lib/auth.ts`
- **Server-side fetch**: use `getBaseUrl()` from `@/lib/base-url` for absolute URLs in Server Components
- **Route handler dynamic imports**: `lib/prisma` and `lib/auth` are imported with `await import(...)` inside handlers to avoid module init at build time

## Gotchas

- **`params` is a Promise in Next.js 16**: route handler signature is `{ params }: { params: Promise<{ id: string }> }` — must `await params` before destructuring
- **Prisma 7 + adapter-pg**: `PrismaClient` takes an `adapter` option; init pattern in `lib/prisma.ts` differs from Prisma < v7 docs
- **Tailwind v4**: no `tailwind.config.ts`; styles configured via `@import "tailwindcss"` + `@theme inline` in `globals.css`; PostCSS uses `@tailwindcss/postcss`
- **NextAuth v4** (not v5/Auth.js): different API surface — `getServerSession(authOptions)` not `auth()`
- **`prisma generate` before build**: wired into `npm run build` and `postinstall`; run after every schema change

## Workflow

All feature work follows a 9-phase AI-assisted workflow. Invoke the matching skill at each phase:

1. **Idea → Spec**: `/superpowers:brainstorming` — clarify requirements, compare approaches, produce a spec doc
2. **Spec → Backlog**: `/embla-core:jira spec <path>` — parse spec, review, auto-create Epics/Stories/Tasks in Jira
3. **Story kickoff**: `/embla-core:develop` — fetch ticket, move to In Progress, create branch (linked to Jira)
4. **Implementation plan**: `/superpowers:writing-plans` — step-by-step plan with exact code + expected output per task
5. **Build**: `/superpowers:subagent-driven-development` — fresh subagent per task; spec + quality review gates before advancing
6. **Version control**: branches `feature/AIEX-NNN-description`; commits `feat(AIEX-NNN): description`; pushes both Bitbucket + GitHub
7. **CI**: every push runs install → prisma generate → tests; must pass before merge
8. **PR wrap-up**: `/superpowers:finishing-a-development-branch` — verify tests, generate PR description, open PR
9. **Deploy**: Vercel auto-deploys previews on every branch push; production on merge to master



