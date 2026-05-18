---
name: next-dynamic-route
description: Generates a Next.js 16 App Router dynamic route handler and Jest test file for endpoints with an ID param (e.g. /api/bids/[id], /api/listings/[id]). Handles GET one, PATCH, DELETE with the exact project conventions — awaited Promise params, lazy Prisma imports, 401→404→403 order. Use this skill whenever adding a detail, update, or delete endpoint for a resource, or writing tests for a dynamic route. Also invoke when a Jira story requires fetching, updating, or deleting a single record by ID. Always use before writing any [id] route file to avoid the Promise params gotcha.
---

# Next.js Dynamic Route Generator

Dynamic routes have an ID param. File: `app/api/<resource>/[id]/route.ts`. Test: `__tests__/api/<resource>/<resource>-id.test.ts`.

**Critical:** `params` is a `Promise` in Next.js 16 — always `await params` before destructuring. This is a breaking change from earlier versions; forgetting it causes a runtime error.

## Step 0 — Story verification

**Resolve the story ID, then confirm with the user.**

1. **Check current session first.** If a Jira story ID is already present in the conversation context or active task, use that as the candidate.

2. **Fall back to branch name.** If no ID is in session, run `git branch --show-current` and parse the ticket from the branch name (format: `feature/AIEX-NNN-...`; use the first ticket number found).

3. **Always confirm with the user.** Whether the ID came from session or branch, ask:

   > "I have you working on `<AIEX-NNN>` — is that right?"

   If they say yes → proceed. If they correct it → use their answer.

4. **Fetch the Jira story.** Call `mcp__claude_ai_Atlassian__getJiraIssue` with cloudId `fb779f96-2443-4319-b441-63d66a63bbaf` to get the summary, description, and acceptance criteria. Use this to understand which HTTP methods are needed, what fields to return, and any ownership/permission rules — fill in `<model>`, `<resource>`, and field names without asking the user to repeat what Jira already says.

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
- Order checks: 401 → 404 → 403 — never check ownership before existence

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

## Final step — Session summary

After completing all steps, output a summary so the current session has a clear record:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ next-dynamic-route complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Story:    AIEX-NNN — <story summary>

Files created:
  app/api/<resource>/[id]/route.ts
  __tests__/api/<resource>/<resource>-id.test.ts

Tests:    npm run test — <passed / N failures>
Build:    npm run build — <clean / errors>

Next:     <suggested next step, e.g. "Run /verify-story-subtask to close completed subtasks">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
