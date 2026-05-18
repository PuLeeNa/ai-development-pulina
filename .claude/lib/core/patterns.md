# Sneaker Drop — Mandatory Coding Patterns

All agents read this before writing any code. These are not suggestions.

---

## API Routes

### Dynamic imports (Jest mock hoisting fix)
```ts
// Inside the handler body — never top-level
const { prisma } = await import("@/lib/prisma")
const { authOptions } = await import("@/lib/auth")
```

### Async params (Next.js 16 breaking change)
```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
```

### Auth guard
```ts
const session = await getServerSession(authOptions)
if (!session?.user?.id)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
```

### Error response format
```ts
return NextResponse.json({ error: "Human-readable message" }, { status: 400 })
```

---

## Server Component Pages

```ts
export const dynamic = "force-dynamic"  // always add this

// Query Prisma directly — never fetch from own API routes
import { prisma } from "@/lib/prisma"
const listings = await prisma.listing.findMany(...)

// Pass ISO string to CountdownTimer
<CountdownTimer closingTime={listing.closingTime.toISOString()} />
```

---

## Client Components

```tsx
// Loading state — always show spinner, never return null
if (status === "loading") return (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
  </div>
)

// After mutating server data — refresh Server Component
router.refresh()

// BidForm key — forces remount when myBid changes after refresh
<BidForm key={myBid ?? "new"} ... />
```

---

## Unit Tests

```ts
// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: { listing: { findMany: jest.fn() }, bid: { count: jest.fn() } }
}))

// Mock next-auth
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }))

// Params in tests
const params = { params: Promise.resolve({ id: "test-id" }) }
```

---

## Prisma (v7 — adapter-pg pattern)

```ts
// lib/prisma.ts — the singleton (do not change this)
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
```

Local `.env`: direct URL (port 5432) — for migrations
Vercel env vars: pooler URL (port 6543) — for serverless runtime

---

## The Sealed Bid Rule (business-critical)

While a listing is open, **no bid amount is ever returned to any user** except the bidder who placed it.
- Public: `bidderCount` (integer)
- Viewer-only: `myBid` (their own amount, null if they haven't bid or if they're the seller)
- Never: any other bid amount, any list of bids, any highest bid
