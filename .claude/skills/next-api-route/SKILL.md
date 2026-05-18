---
name: next-api-route
description: Generate a new Next.js 16 App Router API route and its Jest test file, following the exact conventions of this project (lazy Prisma imports, dynamic Promise params, NextAuth v4 session check, adapter-pg). Use this skill whenever adding a new API endpoint, creating a route handler, or writing tests for an existing route. Triggers on: "add a route for", "create an API endpoint", "add GET/POST/PATCH/DELETE for", "write a route handler", "add tests for the X route", "create the bids API".
---

# Next.js API Route Generator

This project uses **Next.js 16 App Router** with strict conventions that differ from Next.js docs. Follow this skill exactly — the patterns are non-negotiable.

## Step 1: Identify route type

**Collection route** — no ID param, e.g. `/api/bids`
→ file: `app/api/bids/route.ts`

**Dynamic route** — has an ID param, e.g. `/api/bids/[id]`
→ file: `app/api/bids/[id]/route.ts`

Ask if unclear.

## Step 2: Write the route file

### Collection route template (`app/api/<resource>/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

// Public GET — no auth check needed
export async function GET() {
  const { prisma } = await import("@/lib/prisma")
  const items = await prisma.<model>.findMany({
    where: { /* active records only */ },
    orderBy: { createdAt: "desc" },
    select: { /* explicit fields only — never select passwordHash */ },
  })
  return NextResponse.json(items)
}

// Protected POST
export async function POST(req: NextRequest) {
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { field1, field2 } = await req.json()

  // Validate required fields before touching the DB
  if (!field1 || field2 == null)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })

  const { prisma } = await import("@/lib/prisma")
  const item = await prisma.<model>.create({
    data: {
      userId: session.user.id,
      field1,
      field2,
    },
  })
  return NextResponse.json({ id: item.id }, { status: 201 })
}
```

### Dynamic route template (`app/api/<resource>/[id]/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

// params is a Promise in Next.js 16 — must await before destructuring
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
  const updated = await prisma.<model>.update({
    where: { id },
    data: { field },
  })
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

### Key rules (never break these)

- **Always `await import(...)` inside the handler** — never top-level imports for `@/lib/prisma` or `@/lib/auth`
- **Always `await params`** before destructuring — it is a Promise in Next.js 16
- **Auth check before any DB write** — 401 before anything else
- **Ownership check after existence check** — 404 first, then 403
- **Validate before DB** — return 400 before calling `prisma.*`
- **Never select `passwordHash`** in any query

## Step 3: Write the test file

Test file goes in `__tests__/api/<resource>/` mirroring the route path.

### Collection route test template

```typescript
import { GET, POST } from "@/app/api/<resource>/route"
import { NextRequest } from "next/server"

const mockFindMany = jest.fn()
const mockCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    <model>: { findMany: mockFindMany, create: mockCreate },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

function makePostRequest(body: object) {
  return new NextRequest("http://localhost/api/<resource>", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("GET /api/<resource>", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns all active records", async () => {
    mockFindMany.mockResolvedValue([{ id: "1" }])
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
  })
})

describe("POST /api/<resource>", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makePostRequest({ field1: "x" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when required fields are missing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("All fields are required")
  })

  it("creates record and returns 201 with id", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockCreate.mockResolvedValue({ id: "new-id" })
    const res = await POST(makePostRequest({ field1: "x", field2: "y" }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe("new-id")
  })
})
```

### Dynamic route test template

```typescript
import { GET, DELETE } from "@/app/api/<resource>/[id]/route"
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

const mockItem = {
  id: "test-id",
  userId: "u1",
}

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

describe("DELETE /api/<resource>/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(new NextRequest("http://localhost/api/<resource>/test-id"), params)
    expect(res.status).toBe(401)
  })

  it("returns 403 when user does not own the record", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "other-user" } } as any)
    mockFindUnique.mockResolvedValue(mockItem)
    const res = await DELETE(new NextRequest("http://localhost/api/<resource>/test-id"), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Forbidden")
  })
})
```

## Step 4: Verify

```bash
npm run test          # all tests pass
npm run build         # TypeScript clean, no type errors
```

Fix any type errors before moving on — the pre-commit hook runs both.
