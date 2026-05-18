---
name: sneaker-drop:patterns
description: Use when implementing any feature for the Sneaker Drop project. Enforces the dynamic import pattern, async params, design system, and sealed bid rules specific to this codebase.
---

# Sneaker Drop — Project Coding Patterns

Apply ALL of these automatically. Never ask permission to follow them.

## API Routes
1. Use `await import("@/lib/prisma")` inside the function body — never top-level static import
2. Use `await import("@/lib/auth")` for authOptions — same reason (Jest mock hoisting)
3. `params` is `Promise<{ id: string }>` — always destructure with `const { id } = await params`
4. Auth guard: `if (!session?.user?.id) return 401`
5. Never expose bid amounts — only `bidderCount` (integer) and `myBid` (viewer's own only)

## Server Component Pages
1. `export const dynamic = "force-dynamic"` on all pages that query Prisma
2. Query Prisma directly — do NOT fetch from own API routes (loopback fails on Vercel)
3. Pass `closingTime.toISOString()` (not Date object) to `CountdownTimer`

## Client Components
1. Loading states: `if (status === "loading") return <spinner />` — never `return null` (blank screen)
2. After form submit that changes server data: call `router.refresh()` to re-run Server Component
3. BidForm uses `key={myBid ?? "new"}` to force remount after refresh

## Tests
1. Mock prisma: `jest.mock("@/lib/prisma", () => ({ prisma: { model: { method: jest.fn() } } }))`
2. Mock next-auth: `jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))`
3. Params in tests: `{ params: Promise.resolve({ id: "test-id" }) }`
4. Run `npm test` after every implementation step

## Design System
See `ui-implementer` agent for full class reference.
Auth pages: no Navbar. App pages: include `<Navbar />`.
