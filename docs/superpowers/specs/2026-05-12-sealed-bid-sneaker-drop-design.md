# Sealed-Bid Sneaker Drop — Design Spec

**Date:** 2026-05-12  
**Author:** Pulina Wickramasooriya

---

## One-Line Pitch

A reseller offloads limited-edition sneakers via sealed-bid auctions — each bidder sees only their own bid and the count of competitors; the highest bid at close wins, with no live leaderboard to manipulate.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Database | Supabase (managed Postgres) |
| ORM | Prisma |
| Auth | NextAuth — Credentials provider (email + bcrypt password) |

---

## Roles

### Anyone (unauthenticated)
- Browse all non-cancelled listings
- View listing detail: title, photo, description, starting price, closing time countdown, bidder count
- After close: see winner username and winning amount

### Seller (authenticated user who created a listing)
- Create a listing with: title, description, photo URL, starting price, closing time
- View their own open listing: bidder count only — no bid amounts (same as anyone)
- Cancel their listing before any bid has been placed
- After close: see winner username and winning amount
- Cannot bid on their own listing

### Bidder (authenticated user who is not the listing's seller)
- View an open listing: bidder count + their own bid amount (if submitted)
- Submit a sealed bid (amount ≥ starting price) while listing is open
- Update their bid before close — new amount overwrites the previous one
- Cannot bid after close
- After close: see winner username, winning amount, and their own bid side by side

---

## Data Model

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  username     String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  listings     Listing[]
  bids         Bid[]
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
  bids          Bid[]
}

model Bid {
  id        String   @id @default(cuid())
  listingId String
  listing   Listing  @relation(fields: [listingId], references: [id])
  bidderId  String
  bidder    User     @relation(fields: [bidderId], references: [id])
  amount    Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([listingId, bidderId])
}
```

**Key decisions:**
- Open vs. closed is derived from `closingTime < now()` — no stored status field. The only stored state is `cancelled`.
- `@@unique([listingId, bidderId])` enforces one bid per bidder per listing at the DB level; upsert replaces on update.
- `createdAt` on `Bid` is used for tie-breaking: earlier submission wins when two bids are equal.

---

## API Routes

```
POST   /api/auth/signup                — register (email, username, password)
       /api/auth/[...nextauth]         — NextAuth (signin, signout, session)

GET    /api/listings                   — list all non-cancelled listings (open + closed)
POST   /api/listings                   — create listing (auth required)

GET    /api/listings/[id]              — listing detail (seal rules apply, see below)
DELETE /api/listings/[id]              — cancel listing (seller only, zero bids only)

POST   /api/listings/[id]/bid          — place or update bid
                                         (auth required, not seller, listing open, amount ≥ startingPrice)
```

There is **no** `GET /api/listings/[id]/bids` endpoint. The bid collection is never exposed directly.

### Seal Rules on `GET /api/listings/[id]`

| State | Viewer | Response includes |
|---|---|---|
| Open | Anyone / seller | title, description, photo, startingPrice, closingTime, bidderCount |
| Open | Authenticated bidder | + their own bid amount |
| Closed | Anyone (not a past bidder) | + winnerUsername, winningAmount |
| Closed | Authenticated past bidder | + winnerUsername, winningAmount, their own bid amount |

The seller sees the same response as an unauthenticated visitor while the listing is open — no bid amounts, ever.

### Reveal Mechanism

Lazy reveal: `GET /api/listings/[id]` checks `closingTime < now()` on every request. If true, it computes the winner (highest `amount`; ties broken by earliest `createdAt`) and returns the full result. No background job or cron required.

---

## Pages

```
/auth/signup          — register form: email, username, password
/auth/signin          — login form

/listings             — listing cards (open + closed), accessible to all
/listings/new         — create listing form (auth required)
                        fields: title, description, photo URL, starting price, closing time

/listings/[id]        — listing detail (single page, renders based on role + state)
```

### `/listings/[id]` Rendering Rules

| State | Viewer | Shown |
|---|---|---|
| Open | Anyone / seller | Title, photo, description, starting price, countdown, bidder count |
| Open | Seller (zero bids) | + Cancel button |
| Open | Bidder | + their own bid amount + bid form |
| Closed | Anyone | + "Winner: {username} — ${ winningAmount}" |
| Closed | Past bidder | + winner info + "You bid ${myBid}" |
| Closed | Zero bids | "No bids were placed" |

---

## Error Handling & Edge Cases

| Scenario | Behaviour |
|---|---|
| Bid submitted after close | `403 Forbidden` |
| Seller bids on own listing | `403 Forbidden` |
| Bid below starting price | `400 Bad Request` — "Bid must meet the starting price" |
| Seller cancels listing with bids | `403 Forbidden` |
| Non-seller cancels a listing | `403 Forbidden` |
| Two equal highest bids | Earlier `createdAt` wins |
| Listing closes with zero bids | Reveal shows "No bids were placed" — no winner |
| Unauthenticated bid attempt | `401 Unauthorized`, frontend redirects to `/auth/signin` |
| Email or username already taken | `400 Bad Request` with specific field message |

---

## Out of Scope

- Real payment or escrow
- Multiple winners / quantity > 1
- Reserve prices (seller-reject floor)
- Image upload (photo URL string only)
- Auto-extend on last-minute bids
- Buyer ratings
- Mobile-native app

---

## Demo Scenarios

**Happy path:** Seller lists sneakers closing in 2 minutes. Bidder A bids $100, B bids $150, C bids $120. During the open window each bidder sees "3 bidders" and their own amount only. After close: B wins at $150; A and C each see their own losing bid alongside the winner's.

**Failure path:** Bidder A attempts to call a "list all bids" API endpoint on an open listing — blocked (endpoint does not exist). Seller attempts to bid on their own listing — rejected with 403. Bidder attempts to bid after close — rejected with 403.