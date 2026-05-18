# Architecture Decision Record — Sneaker Drop

## ADR-001: Next.js 16 (App Router) as Framework

**Decision:** Use Next.js 16 with the App Router over alternatives (plain Express, Remix, SvelteKit).

**Reasoning:**
- App Router Server Components enable direct Prisma queries at render time without an extra API round-trip
- Built-in support for React Server Components aligns with the sealed display model: server controls what data reaches the client
- TypeScript-first, large ecosystem, Vercel deployment is zero-config

**Trade-off:** Next.js 16 has breaking changes from v14/v15 (async params, Tailwind v4 setup). Documented in AGENTS.md and CLAUDE.md.

---

## ADR-002: Supabase (managed Postgres) over SQLite or Firebase

**Decision:** Use Supabase for the database.

**Reasoning:**
- Managed Postgres requires no local Docker setup for the demo
- Free tier sufficient for a PoC with a handful of users
- Prisma works natively with Postgres

**Trade-off:** Supabase's direct connection (port 5432) fails in Vercel's serverless environment. Must use the pooler URL (port 6543, PgBouncer) for production. Local development continues to use the direct URL.

---

## ADR-003: Prisma v7 with adapter-pg over Prisma v5/v6

**Decision:** Use Prisma v7 (latest) with the `@prisma/adapter-pg` driver adapter.

**Reasoning:**
- Prisma v7 is the current release; using it prepares for the future
- The adapter pattern (`pg.Pool` → `PrismaPg` → `PrismaClient`) is the v7-compatible way to connect to Postgres in serverless environments

**Trade-off:** Prisma v7 removed the `url` field from `schema.prisma`; the datasource URL must be passed at runtime via `pg.Pool`. This required a dedicated `lib/prisma.ts` singleton with the adapter pattern.

---

## ADR-004: NextAuth v4 (Credentials provider) over Supabase Auth or Auth.js v5

**Decision:** Use NextAuth v4 with the CredentialsProvider.

**Reasoning:**
- Full control over the sign-up flow (username captured at registration, not available in Supabase Auth)
- Email + password login is sufficient for this PoC; no OAuth needed
- JWT sessions stored in httpOnly cookies — no database session storage needed

**Trade-off:** Auth.js v5 (beta) is the successor but has a different API. NextAuth v4 is stable and well-documented.

---

## ADR-005: Seal Enforcement at API Layer (not database layer)

**Decision:** Enforce the sealed-bid rule entirely in API route handlers, not via Postgres row-level security or Prisma middleware.

**Reasoning:**
- API routes are the single source of truth for what data leaves the server
- Keeps the enforcement logic in TypeScript where it can be unit-tested with Jest mocks
- No Supabase RLS policies to maintain separately

**Trade-off:** If someone bypasses Next.js and connects directly to the Postgres database, the seal breaks. For a PoC this is acceptable; production would add RLS as a defence-in-depth layer.

**Key seal rule:** `GET /api/listings/[id]` never returns any bid `amount` field while the listing is open. It returns only `bidderCount` (integer) and optionally `myBid` (the authenticated viewer's own amount — null for sellers and non-bidders).

---

## ADR-006: Lazy Reveal (no background job)

**Decision:** Reveal the winner on the first request after `closingTime` passes rather than via a scheduled background job.

**Reasoning:**
- Vercel serverless has no always-on process to run a cron job
- For a demo with active participants, lazy reveal is indistinguishable from a scheduled reveal
- Removes operational complexity (no worker process, no queue)

**Trade-off:** If nobody visits a listing after it closes, the winner is never "officially" recorded. For a PoC this is fine; production would add Vercel Cron or a Supabase scheduled function.

---

## ADR-007: Server Components Query Prisma Directly

**Decision:** Page-level Server Components (e.g. `/listings/page.tsx`) call Prisma directly rather than fetching from their own API routes.

**Reasoning:**
- Fetching from own API routes over HTTP in a serverless environment introduces a loopback network call that can fail or time out
- Server Components already run server-side; direct Prisma access is the idiomatic Next.js App Router pattern
- Reduces latency (no extra HTTP round-trip)

**Trade-off:** The API routes (`GET /api/listings`) still exist for client-side use (e.g. `CancelButton`, `BidForm`). Server Components and client components access data through different paths.
