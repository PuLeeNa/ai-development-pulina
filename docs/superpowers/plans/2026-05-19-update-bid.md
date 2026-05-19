# Update Bid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Explicitly test the bid update path and show a transient success message in the UI after bid submission.

**Architecture:** The API already handles updates via `prisma.bid.upsert()` — no backend changes needed. Task 1 adds two test cases to the existing test suite to document the update behaviour. Task 2 adds a `success` state to `BidForm` that shows a 2-second confirmation message after a successful POST.

**Tech Stack:** Next.js 16 App Router, TypeScript, Jest, React, Tailwind CSS v4

---

### Task 1: Add update-path tests to bid.test.ts

**Files:**
- Modify: `__tests__/api/listings/bid.test.ts`

- [ ] **Step 1: Add the two new test cases at the end of the describe block**

Open `__tests__/api/listings/bid.test.ts`. After the last test (`"accepts bid at exactly startingPrice"`), add:

```typescript
  it("updates existing bid — upsert update clause contains only amount", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 200 }), params)
    expect(res.status).toBe(201)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { listingId_bidderId: { listingId: "listing-1", bidderId: "bidder-1" } },
      create: { listingId: "listing-1", bidderId: "bidder-1", amount: 200 },
      update: { amount: 200 },
    })
  })

  it("accepts same-amount resubmission silently — no duplicate created", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 100 }), params)
    expect(res.status).toBe(201)
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 2: Run the new tests to verify they pass**

```bash
cd .worktrees/AIEX-732
npm test -- --no-coverage --testPathPattern="bid.test.ts"
```

Expected output:
```
PASS __tests__/api/listings/bid.test.ts
  POST /api/listings/[id]/bid
    ✓ returns 401 when not authenticated
    ...
    ✓ updates existing bid — upsert update clause contains only amount
    ✓ accepts same-amount resubmission silently — no duplicate created

Tests: 14 passed, 14 total
```

- [ ] **Step 3: Run the full test suite to confirm no regressions**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/api/listings/bid.test.ts
git commit -m "test(AIEX-732): add update-bid path and same-amount resubmission tests"
```

---

### Task 2: Add success feedback to BidForm

**Files:**
- Modify: `app/components/BidForm.tsx`

- [ ] **Step 1: Replace the contents of BidForm.tsx with the updated version**

```tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface BidFormProps {
  listingId: string
  startingPrice: number
  existingBid?: number
}

export default function BidForm({ listingId, startingPrice, existingBid }: BidFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState(existingBid?.toString() ?? "")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/listings/${listingId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Something went wrong")
        return
      }
      setSuccess(existingBid ? "Bid updated!" : "Bid placed!")
      setTimeout(() => setSuccess(null), 2000)
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="bid-amount" className="block text-sm font-medium text-zinc-400 mb-2">
          Your bid
        </label>
        <div className="flex gap-2">
          <input
            id="bid-amount"
            type="number"
            min={startingPrice}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`$${startingPrice.toLocaleString()} min`}
            required
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {loading ? "Placing…" : existingBid ? "Update bid" : "Place bid"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm">{error}</p>
      )}
      {success && (
        <p role="status" className="text-green-400 bg-green-400/10 rounded-lg px-4 py-3 text-sm">{success}</p>
      )}
    </form>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd .worktrees/AIEX-732
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --no-coverage
```

Expected: all tests pass (BidForm has no Jest tests — TS check and visual review are the verification).

- [ ] **Step 4: Commit**

```bash
git add app/components/BidForm.tsx
git commit -m "feat(AIEX-732): show transient success message after bid submit or update"
```
