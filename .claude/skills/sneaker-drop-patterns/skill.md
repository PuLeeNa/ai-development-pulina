---
name: sneaker-drop:patterns
description: Apply when implementing any feature in the Sneaker Drop project to enforce dynamic imports, async params, design system rules, and sealed bid constraints.
type: flexible
---

# Sneaker Drop — Project Coding Patterns

Apply all of these automatically when writing code for this project.

## API Routes
1. **Dynamic imports** inside the handler body — never top-level:
   ```ts
   const { prisma } = await import("@/lib/prisma")
   const { authOptions } = await import("@/lib/auth")
   ```
2. **Async params** — `params: Promise<{ id: string }>`, then `const { id } = await params`
3. **Auth guard** — `if (!session?.user?.id) return 401`
4. **Seal rule** — never expose bid amounts except `myBid` (viewer's own only)

## Server Component Pages
1. Add `export const dynamic = "force-dynamic"`
2. Query Prisma directly — do not fetch from own API routes
3. Pass `closingTime.toISOString()` to `CountdownTimer` (not a Date object)

## Client Components
1. Loading state: show a spinner — never `return null` (blank screen)
2. After mutating data: call `router.refresh()` to re-run the Server Component
3. When passing `myBid` as `defaultValue`: use `key={myBid ?? "new"}` on the form component to force remount after refresh

## Unit Tests
1. Mock prisma with `jest.mock("@/lib/prisma", () => ({ prisma: { model: { method: jest.fn() } } }))`
2. Mock next-auth with `jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))`
3. Route params in tests: `{ params: Promise.resolve({ id: "test-id" }) }`

## Design System Quick Reference
- Auth pages: no Navbar, centered card on `bg-zinc-950`
- App pages: `<Navbar />` at top
- Primary CTA: `bg-amber-400 text-black`
- Inputs: `bg-zinc-800 border-zinc-700 text-white focus:ring-amber-400`
