---
name: next-dynamic-route
description: Generate a Next.js 16 App Router dynamic route handler and its Jest test file for routes with an ID param (e.g. /api/bids/[id], /api/listings/[id]). Covers GET one, PATCH, DELETE patterns. Use this skill when adding a resource detail endpoint or writing tests for a dynamic route. Triggers on: "add a route for [id]", "create a dynamic endpoint", "add GET/PATCH/DELETE for single", "add /api/X/[id] route".
---

# Next.js Dynamic Route Generator

Dynamic routes have an ID param. File goes at `app/api/<resource>/[id]/route.ts`.
Test file goes at `__tests__/api/<resource>/<resource>-id.test.ts`.

**Critical:** `params` is a `Promise` in Next.js 16 — always `await params` before destructuring.

## Route template

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

// params is a Promise in Next.js 16 — must await
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { prisma } = await import("@/lib/prisma")
  const item = await prisma.<model>.findUnique({
    where: { id },
    include: { /* relations if needed */ },
  })
  if (!item)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prisma } = await import("@/lib/prisma")
  const item = await prisma.<model>.findUnique({ where: { id } })
  if (!item)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (item.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { field } = await req.json()
  const updated = await prisma.<model>.update({ where: { id }, data: { field } })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prisma } = await import("@/lib/prisma")
  const item = await prisma.<model>.findUnique({ where: { id } })
  if (!item)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (item.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await prisma.<model>.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

**Rules:**
- Always `await import(...)` inside handlers — never top-level
- Always `await params` — it is a Promise in Next.js 16
- Order: 401 → 404 → 403 — never check ownership before existence

## Test template

```typescript
import { GET, PATCH, DELETE } from "@/app/api/<resource>/[id]/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    <model>: { findUnique: mockFindUnique, update: mockUpdate, delete: mockDelete },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// params is a Promise — always mock as Promise.resolve
const params = { params: Promise.resolve({ id: "test-id" }) }

const mockItem = { id: "test-id", userId: "u1" }

describe("GET /api/<resource>/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 404 when not found", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/<resource>/test-id"), params)
    expect(res.status).toBe(404)
  })

  it("returns the record", async () => {
    mockFindUnique.mockResolvedValue(mockItem)
    const res = await GET(new NextRequest("http://localhost/api/<resource>/test-id"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe("test-id")
  })
})

describe("PATCH /api/<resource>/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await PATCH(new NextRequest("http://localhost/api/<resource>/test-id", {
      method: "PATCH", body: JSON.stringify({ field: "x" }),
      headers: { "Content-Type": "application/json" },
    }), params)
    expect(res.status).toBe(401)
  })

  it("returns 404 when not found", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockFindUnique.mockResolvedValue(null)
    const res = await PATCH(new NextRequest("http://localhost/api/<resource>/test-id", {
      method: "PATCH", body: JSON.stringify({ field: "x" }),
      headers: { "Content-Type": "application/json" },
    }), params)
    expect(res.status).toBe(404)
  })

  it("returns 403 when user does not own the record", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "other" } } as any)
    mockFindUnique.mockResolvedValue(mockItem)
    const res = await PATCH(new NextRequest("http://localhost/api/<resource>/test-id", {
      method: "PATCH", body: JSON.stringify({ field: "x" }),
      headers: { "Content-Type": "application/json" },
    }), params)
    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/<resource>/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(new NextRequest("http://localhost/api/<resource>/test-id"), params)
    expect(res.status).toBe(401)
  })

  it("returns 403 when user does not own the record", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "other" } } as any)
    mockFindUnique.mockResolvedValue(mockItem)
    const res = await DELETE(new NextRequest("http://localhost/api/<resource>/test-id"), params)
    expect(res.status).toBe(403)
  })
})
```

## Verify

```bash
npm run test && npm run build
```
