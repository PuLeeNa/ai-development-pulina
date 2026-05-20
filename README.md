**Live demo:** [https://ai-development-pulina.vercel.app](https://ai-development-pulina.vercel.app)

---

# Sneaker Drop - AI-Assisted SDLC Exercise

A sealed-bid sneaker auction platform. Sellers list limited-edition sneakers; bidders submit blind bids — no live leaderboard, no sniping. The highest bid wins at close, revealed to everyone at the same moment.

## How It Works

- **Sealed bids** — your amount stays hidden from everyone, including the seller
- **Bidder count only** — you see how many competitors, never what they bid
- **Reveal at close** — winner's username and winning amount shown to all when the auction ends
- **Losers see their own bid** — alongside the winner's, for full closure

## Features

| Feature | Status |
|---|---|
| User registration & sign-in (email + password) | ✅ Done |
| Create listings (title, photo URL, price, closing time) | ✅ Done |
| Browse listings with live countdown timer | ✅ Done |
| Cancel listing before any bids | ✅ Done |
| Sealed bid submission (amount ≥ starting price) | ✅ Done |
| Bid update before close | ✅ Done |
| Sealed display — bidder count only while open | ✅ Done |
| Auction reveal at close — winner + losing bids shown | ✅ Done |
| Self-bid blocked | ✅ Done |
| Dark zinc/amber UI with loading spinners | ✅ Done |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (managed Postgres) |
| ORM | Prisma v7 + `@prisma/adapter-pg` |
| Auth | NextAuth v4 (Credentials provider) |
| Styling | Tailwind CSS v4 |
| Testing | Jest — 45 tests across 4 suites |
| CI | GitHub Actions + Bitbucket Pipelines |
| Deploy | Vercel (auto-deploy on merge to master) |

## Run Locally in 5 Minutes

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)

### 1. Clone and install

```bash
git clone https://github.com/PuLeeNa/ai-development-pulina.git
cd ai-development-pulina
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

Get `DATABASE_URL` from: Supabase Dashboard → Connect → Direct → URI.

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Start

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running Tests

```bash
npm test
```

45 tests, 4 suites. All must pass before any commit (enforced by a pre-commit hook).

## Project Structure

```
app/
├── api/
│   ├── auth/          # NextAuth + POST /api/auth/signup
│   └── listings/      # GET/POST /api/listings, GET/DELETE/bid /api/listings/[id]
├── auth/              # /auth/signin, /auth/signup pages
├── listings/          # /listings, /listings/new, /listings/[id] pages
├── components/        # Navbar, CountdownTimer, CancelButton, BidForm
└── page.tsx           # Landing page

lib/
├── auth.ts            # NextAuth CredentialsProvider config
└── prisma.ts          # Prisma v7 singleton with pg.Pool adapter

prisma/
└── schema.prisma      # User, Listing, Bid models
```

## AI-Assisted SDLC

This project was built using a full AI-assisted software development lifecycle with Claude Code. AI was used across every phase — not just coding.

### Workflow

| Phase | Tool Used |
|---|---|
| Requirements → Jira backlog | `/superpowers:brainstorming` → `/embla-core:jira` |
| Story kickoff (branch + Jira transition) | `/embla-core:develop` |
| Implementation planning | `/superpowers:writing-plans` |
| Task execution with reviews | `/superpowers:subagent-driven-development` |
| Code review | `/code-review:code-review` |
| Branch wrap-up + PR | `/superpowers:finishing-a-development-branch` |

Each story followed: **spec → plan → fresh subagent per task → two-stage review (spec compliance + code quality) → commit → PR → deploy**.

### `.claude/` Folder

The project ships a committed `.claude/` folder that configures the AI environment for every session:

```
.claude/
├── settings.json          # Plugins, permissions, pre-commit hook
├── embla.json             # Jira/Bitbucket project config
├── commands/              # Custom slash commands
│   ├── start-worktree.md  # /start-worktree — create isolated worktree per ticket
│   ├── new-branch.md      # /new-branch — create feature branch from ticket
│   ├── check.md           # /check — run TypeScript + tests + smoke checklist
│   ├── verify-story.md    # /verify-story — validate story against AC
│   └── verify-story-subtask.md
├── skills/                # Project-specific AI skills (auto-invoked by Claude)
│   ├── prisma-schema-change/  # Enforces safe Prisma migration workflow
│   ├── next-dynamic-route/    # Patterns for [id] route handlers
│   ├── next-collection-route/ # Patterns for collection route handlers
│   └── ui-style/              # Design system rules for all UI work
└── hooks/
    └── pre-commit.sh      # Blocks commits to master, runs tsc + npm test
```

**`CLAUDE.md`** (project root) is loaded at every Claude Code session start. It contains the full stack overview, request/auth flow, directory structure, key coding conventions, known gotchas, a skills table mapping each code area to the skill that must run before touching it, and the 9-phase AI-SDLC workflow — so every session has complete project context without re-explaining anything.

- **Skills** are auto-invoked when Claude touches specific areas (schema changes, API routes, UI). They enforce project patterns without needing to be called manually.
- **Commands** are slash commands that automate repeated workflows — worktree creation, story verification, quality checks.
- **The pre-commit hook** acts as a local CI gate — no broken code can be committed.

### Parallel Development with Worktrees

Independent stories were worked on simultaneously using git worktrees — each story in its own isolated folder with its own Claude Code session, sharing git history but no working-tree state.

```bash
# Each story gets its own isolated workspace
git worktree add ../ai-development-pulina-AIEX-728 -b feature/AIEX-728
# Open a second Claude Code window in that folder → parallel work with no conflicts
```

## Architecture Decisions

See [ADR.md](ADR.md) for documented decisions on framework choice, database setup, Prisma v7 adapter pattern, auth strategy, seal enforcement, lazy reveal, and Server Component data fetching.

## CI/CD

- **GitHub Actions** — runs `npm ci → prisma generate → npm test` on every push and PR
- **Bitbucket Pipelines** — same pipeline on Bitbucket
- **Vercel** — auto-deploys preview on every branch push, production on merge to `master`

> **Vercel note:** `DATABASE_URL` must be the Supabase **pooler URL** (port 6543), not the direct URL (port 5432). Serverless functions require connection pooling.

## Jira Project

[AIEX — AISDLC Exercise](https://emblaftdev.atlassian.net/jira/software/projects/AIEX/boards)
