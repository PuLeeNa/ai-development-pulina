---
name: next-collection-route
description: Generate a Next.js 16 App Router collection route handler and its Jest test file for routes with no ID param (e.g. /api/bids, /api/listings). Covers GET all and POST create patterns. Use this skill when adding a new resource endpoint or writing tests for a collection route. Triggers on: "add a route for", "create a collection endpoint", "add GET/POST for", "create the bids API", "add /api/X route".
---

# Next.js Collection Route Generator

Collection routes have no ID param. File goes at `app/api/<resource>/route.ts`.
Test file goes at `__tests__/api/<resource>/<resource>.test.ts`.

## Route template

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

// Public GET — no auth needed
export async function GET() {
  const { prisma } = await import("@/lib/prisma")
  const items = await prisma.<model>.findMany({
    where: { /* active filter */ },
    orderBy: { createdAt: "desc" },
    select: { /* explicit fields — never select passwordHash */ },
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

  if (!field1 || field2 == null)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })

  const { prisma } = await import("@/lib/prisma")
  const item = await prisma.<model>.create({
    data: { userId: session.user.id, field1, field2 },
  })
  return NextResponse.json({ id: item.id }, { status: 201 })
}
```

**Rules:**
- Always `await import(...)` inside handlers — never top-level
- Validate before any DB call
- Never select `passwordHash`

## Test template

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

## Verify

```bash
npm run test && npm run build
```
