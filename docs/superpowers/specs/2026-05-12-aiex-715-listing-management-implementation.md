# AIEX-715: Listing Management — Implementation Spec

**Date:** 2026-05-12
**Jira:** AIEX-715 (Epic) — covers AIEX-716, AIEX-721, AIEX-724
**Stack:** Next.js 16 (App Router, TypeScript), Prisma v7 + adapter-pg, Supabase Postgres, NextAuth v4, Tailwind CSS v4

---

## Approach

Server Components fetch listing data at request time via API routes. A small `"use client"` `CountdownTimer` component handles the live countdown on listing cards and the detail page. The `CancelButton` is a separate client island on the detail page. All data mutations go through API routes — never directly from Server Components to Prisma — keeping the access control rules in one place, ready for the Sealed Bidding epic.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add Listing model + User.listings relation |
| `app/api/listings/route.ts` | Create | GET all listings + POST create listing |
| `app/api/listings/[id]/route.ts` | Create | GET single listing + DELETE cancel listing |
| `app/listings/page.tsx` | Create | Browse listings (Server Component) |
| `app/listings/new/page.tsx` | Create | Create listing form ("use client") |
| `app/listings/[id]/page.tsx` | Create | Listing detail (Server Component) |
| `app/components/CountdownTimer.tsx` | Create | Live countdown client component |
| `app/components/CancelButton.tsx` | Create | Cancel listing client component |

---

## Data Model

```prisma
// prisma/schema.prisma

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  username     String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  listings     Listing[]
}

model Listing {
  id            String   @id @default(cuid())
  sellerId      String
  seller        User     @relation(fields: [sellerId], references: [id])
  title         String
  description   String
  photoUrl      String
  startingPrice Float
  closingTime   DateTime
  cancelled     Boolean  @default(false)
  createdAt     DateTime @default(now())
}
```

Migration: `npx prisma migrate dev --name add-listing`

> `bids` relation on User and Bid model are added in AIEX-728. Do not add them here.

---

## API Routes

### `app/api/listings/route.ts`

**GET** — Browse listings (no auth required)
- Returns all listings where `cancelled = false`, ordered by `closingTime ASC`
- Response fields per listing: `id, title, photoUrl, startingPrice, closingTime, sellerId, createdAt`

**POST** — Create listing (auth required)
- Returns `401` if no session
- Validates: all fields present, `startingPrice > 0`, `closingTime > now()`
- Creates `Listing` with `sellerId = session.user.id`
- Returns `201 { id }`

**Validation errors:**

| Condition | Status | Message |
|---|---|---|
| Missing any field | 400 | "All fields are required" |
| `startingPrice <= 0` | 400 | "Starting price must be greater than zero" |
| `closingTime <= now` | 400 | "Closing time must be in the future" |
| No session | 401 | "Unauthorized" |

---

### `app/api/listings/[id]/route.ts`

**GET** — Single listing (no auth required)
- Returns listing with `seller.username` and `_count.bids` (bidCount)
- Returns `404` if listing not found

**DELETE** — Cancel listing (auth required)
- Returns `401` if no session
- Returns `403 { error: "Forbidden" }` if `session.user.id !== listing.sellerId`
- Returns `403 { error: "Cannot cancel a listing with bids" }` if `listing._count.bids > 0`
- Sets `cancelled = true`, returns `200`

---

## Components

### `app/components/CountdownTimer.tsx`

```
"use client"
Props: closingTime: string (ISO date string)

- Computes time remaining via setInterval every 1000ms
- If closingTime <= now → renders amber "Closed" badge
- If open → renders "Closes in Xd Xh Xm Xs" in text-zinc-400
- Cleans up interval on unmount
```

### `app/components/CancelButton.tsx`

```
"use client"
Props: listingId: string

- Renders an outlined red/zinc "Cancel listing" button
- On click → calls DELETE /api/listings/[listingId]
- On success → router.push("/listings")
- On error → displays inline error message
```

---

## Pages

### `app/listings/page.tsx` — Server Component

- Fetches `GET /api/listings`
- Renders `<Navbar />`
- Grid of listing cards: photo (`<img>`), title, `$startingPrice`, `<CountdownTimer />`
- Each card links to `/listings/[id]`
- Empty state: "No listings yet. Be the first to list a pair."
- Includes "Create Listing" CTA button for authenticated users

### `app/listings/new/page.tsx` — `"use client"`

- `useSession()` — if `status === "unauthenticated"` → `router.push("/auth/signin")`
- If `status === "loading"` → return null
- Form fields: Title, Description, Photo URL, Starting Price (number), Closing Time (`datetime-local`)
- Submits to `POST /api/listings`
- On success → `router.push("/listings/" + data.id)`
- On error → inline field-level error message
- Dark zinc/amber design, `<Navbar />`, no auth-free access

### `app/listings/[id]/page.tsx` — Server Component

- Fetches `GET /api/listings/[id]`
- If listing is cancelled → `redirect("/listings")`
- Renders: photo, title, description, starting price, `<CountdownTimer closingTime={...} />`
- Seller section: if `session.user.id === listing.sellerId` AND `bidCount === 0` AND `new Date(listing.closingTime) > new Date()` → renders `<CancelButton listingId={id} />`
- Uses `getServerSession(authOptions)` to check session server-side

> Note: this is a partial detail page for this epic. Sealed bid display rules (bidder count, bid form, reveal) are added in AIEX-728/734.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| POST with closing time in past | 400 "Closing time must be in the future" |
| POST with startingPrice = 0 | 400 "Starting price must be greater than zero" |
| POST with missing field | 400 "All fields are required" |
| Unauthenticated POST | 401, page redirects to /auth/signin |
| DELETE by non-seller | 403 "Forbidden" |
| DELETE on listing with bids | 403 "Cannot cancel a listing with bids" |
| GET cancelled listing | Redirect to /listings |
| GET non-existent listing | 404 |
| /listings empty | "No listings yet" empty state |

---

## Acceptance Criteria

**AIEX-716 (Create Listing):**
- Valid fields + future closing time → Listing created, redirect to `/listings/[id]`
- Closing time in past → 400 "Closing time must be in the future"
- Missing required field → 400 "All fields are required"
- Unauthenticated → redirect to `/auth/signin`

**AIEX-721 (Cancel Listing):**
- Seller + zero bids → `cancelled = true`, listing removed from `/listings`
- Listing has bids → 403 "Cannot cancel a listing with bids"
- Non-seller → 403 "Forbidden"

**AIEX-724 (Browse Listings):**
- All non-cancelled listings shown (open + closed)
- Cancelled listings excluded
- Empty state when no listings exist
- Closed listings show "Closed" badge via CountdownTimer

---

## Out of Scope

- Bid data on listing detail (AIEX-728/734)
- Sealed bid display rules (AIEX-728/734)
- Image upload (photoUrl is a plain string)
- Listing edit after creation
- Reserve prices