# Sneaker Drop

A sealed-bid sneaker auction platform. Sellers list limited-edition sneakers, bidders submit blind bids — no live leaderboard, no sniping. The highest bid wins at close, revealed to everyone at the same moment.

## How It Works

- **Sealed bids** — your amount stays hidden from everyone, including the seller
- **Bidder count only** — you see how many competitors, never what they bid
- **Reveal at close** — winner and winning amount shown to all when the auction ends

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (managed Postgres) |
| ORM | Prisma v7 |
| Auth | NextAuth v4 (email + password) |
| Styling | Tailwind CSS v4 |
| Testing | Jest |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

1. **Clone and install**

```bash
git clone https://bitbucket.org/emblaftdev/ai-development-pulina.git
cd ai-development-pulina
npm install
```

2. **Configure environment**

```bash
cp .env.example .env
```

Fill in `.env`:

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXTAUTH_SECRET="generate with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

Get your `DATABASE_URL` from: Supabase Dashboard → Connect → Direct → URI.

3. **Run database migrations**

```bash
npx prisma migrate dev
```

4. **Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

| Feature | Status |
|---|---|
| User registration & sign-in | ✅ Done |
| Create listings (title, photo, price, closing time) | ✅ Done |
| Browse listings with live countdown | ✅ Done |
| Cancel listing (before any bids) | ✅ Done |
| Listing detail page | ✅ Done |
| Sealed bid submission | 🔜 In progress |
| Bid reveal at close | 🔜 In progress |

## Project Structure

```
app/
├── api/
│   ├── auth/          # NextAuth + signup endpoint
│   └── listings/      # GET/POST listings, GET/DELETE listing by id
├── auth/              # signin and signup pages
├── listings/          # browse, create, and detail pages
├── components/        # Navbar, CountdownTimer, CancelButton
└── page.tsx           # landing page

lib/
├── auth.ts            # NextAuth config
└── prisma.ts          # Prisma client singleton

prisma/
└── schema.prisma      # User + Listing models
```

## Running Tests

```bash
npm test
```

## Jira Project

[AIEX — AISDLC Exercise](https://emblaftdev.atlassian.net/jira/software/projects/AIEX/boards)