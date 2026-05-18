@AGENTS.md

# Sneaker Drop — Project Context for Claude Code

## What This Is
A sealed-bid sneaker auction platform. Sellers list limited-edition sneakers; bidders submit blind bids. The highest bid wins at close. No live leaderboard — the seal is the core feature.

## Stack
- **Framework:** Next.js 16 (App Router, TypeScript) — see AGENTS.md for breaking changes
- **Database:** Supabase (managed Postgres)
- **ORM:** Prisma v7 with `@prisma/adapter-pg` + `pg.Pool` (NOT the traditional schema.prisma URL approach)
- **Auth:** NextAuth v4 (Credentials provider, JWT sessions)
- **Styling:** Tailwind CSS v4 (uses `@import "tailwindcss"` not `@tailwind` directives)
- **Testing:** Jest with `testEnvironment: "node"`

## Critical Patterns — Read Before Writing Any Code

### Prisma v7 — adapter-pg required
```ts
// lib/prisma.ts — always use pg.Pool, never raw connection string
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
```

### Dynamic imports in API routes (Jest mock hoisting workaround)
```ts
// API routes MUST use dynamic imports for prisma and authOptions
const { prisma } = await import("@/lib/prisma")
const { authOptions } = await import("@/lib/auth")
```

### Async params in Next.js 16 dynamic routes
```ts
// params is a Promise in Next.js 16 — always await it
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
```

### Server Components query Prisma directly
```ts
// NEVER fetch from own API routes in Server Components — use Prisma directly
// Always add: export const dynamic = "force-dynamic"
import { prisma } from "@/lib/prisma"
const listings = await prisma.listing.findMany(...)
```

### Environment variables
- Local `.env`: uses direct Supabase URL (port 5432) — for migrations
- Vercel env vars: uses Supabase POOLER URL (port 6543) — required for serverless
- `NEXTAUTH_URL` must be the actual deployed URL in Vercel, not localhost

## Design System (dark zinc/amber)
- Background: `bg-zinc-950`
- Cards: `bg-zinc-900 border border-zinc-800 rounded-2xl`
- Inputs: `bg-zinc-800 border border-zinc-700 text-white focus:ring-amber-400`
- Primary button: `bg-amber-400 text-black hover:bg-amber-300`
- Error: `text-red-400 bg-red-400/10`
- Auth pages (signin, signup): NO Navbar — centered card only
- App pages (/listings, /listings/[id], etc.): include `<Navbar />`

## Jira Project
- Project key: `AIEX`
- Board: https://emblaftdev.atlassian.net/jira/software/projects/AIEX/boards/251
- Epic → Story → Subtask hierarchy
- Branch format: `feature/AIEX-NNN-short-description`
- Commit format: `feat(AIEX-NNN): description`

## Git Remotes (dual push)
`git push` updates BOTH Bitbucket and GitHub simultaneously.

## Test Command
```bash
npm test
```
15 tests across 3 suites. All must pass before committing.

## Skills to Always Invoke
- Before any code: `/superpowers:brainstorming`
- To create Jira items: `/embla-core:jira`
- To start a story: `/embla-core:develop AIEX-NNN`
- After brainstorm: `/superpowers:writing-plans`
- To execute a plan: `/superpowers:subagent-driven-development`
- To finish a branch: `/superpowers:finishing-a-development-branch`

## What Is NOT Done Yet
- AIEX-728: Sealed bid submission (Bid model + POST /api/listings/[id]/bid)
- AIEX-732: Bid update (upsert preserving createdAt)
- AIEX-734: Sealed display rules (bidderCount + myBid in GET /api/listings/[id])
- AIEX-762: Auction reveal (winner shown after close)
- AIEX-784: Losing bidder view (own bid alongside winner's)
