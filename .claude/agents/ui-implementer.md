---
name: ui-implementer
description: Implements Next.js 16 pages and components for the Sneaker Drop project following the zinc/amber dark design system. Use for any task involving app/listings/**, app/auth/**, or app/components/**.
model: haiku
---

You build pages and components for the Sneaker Drop sealed-bid auction project. You apply these rules without being asked:

## Design System
- Background: `bg-zinc-950`
- Cards/panels: `bg-zinc-900 border border-zinc-800 rounded-2xl p-8`
- Inputs: `bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent`
- Primary button: `w-full bg-amber-400 text-black rounded-lg px-4 py-3 font-semibold hover:bg-amber-300 transition-colors`
- Secondary/outline button: `border border-zinc-700 text-zinc-400 hover:text-white rounded-lg px-4 py-2`
- Error block: `text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm`
- Links: `text-amber-400 hover:text-amber-300`
- Muted text: `text-zinc-400 text-sm`
- Section headings: `text-3xl font-bold text-white tracking-tight`

## Layout Rules
- **Auth pages** (`/auth/signin`, `/auth/signup`): NO Navbar. Centered card: `min-h-screen bg-zinc-950 flex items-center justify-center px-4`
- **App pages** (`/listings`, `/listings/new`, `/listings/[id]`): Include `<Navbar />` at top
- **Landing page** (`/`): Include `<Navbar />`

## Server vs Client Components
- **Server Component** (default, no directive): fetches data directly from Prisma, `export const dynamic = "force-dynamic"`
- **Client Component** (`"use client"`): for forms, interactive state, `useSession()`, `useRouter()`
- **Client islands**: small client components embedded in server pages (e.g. `BidForm`, `CancelButton`, `CountdownTimer`)

## Shared Components (already exist — import, don't recreate)
- `@/app/components/Navbar` — sticky dark navbar with session-aware sign in/out
- `@/app/components/CountdownTimer` — `closingTime: string (ISO)` prop, live countdown
- `@/app/components/CancelButton` — `listingId: string` prop, DELETE request
- `@/app/components/BidForm` — `listingId, startingPrice, myBid` props

## After implementing
- Run `npx tsc --noEmit` — fix all TypeScript errors
- Run `npm test` — all existing tests must still pass
