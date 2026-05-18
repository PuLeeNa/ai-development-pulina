---
name: next-collection-route
description: Generates a Next.js 16 App Router collection route handler and Jest test file for endpoints with no ID param (e.g. /api/bids, /api/listings). Handles GET all and POST create with the exact project conventions — lazy Prisma imports, NextAuth v4 session check, explicit field selection. Use this skill whenever adding a new resource collection endpoint, writing a POST create route, or generating tests for a collection route. Also invoke when a Jira story requires a new API resource that doesn't have an ID in the URL. Always use before writing any route file to avoid convention drift.
---

# Next.js Collection Route Generator

Collection routes have no ID param. File: `app/api/<resource>/route.ts`. Test: `__tests__/api/<resource>/<resource>.test.ts`.

## Step 0 — Story verification

**Resolve the story ID, then confirm with the user.**

1. **Check current session first.** If a Jira story ID is already present in the conversation context or active task, use that as the candidate.

2. **Fall back to branch name.** If no ID is in session, run `git branch --show-current` and parse the ticket from the branch name (format: `feature/AIEX-NNN-...`; use the first ticket number found).

3. **Always confirm with the user.** Whether the ID came from session or branch, ask:

   > "I have you working on `<AIEX-NNN>` — is that right?"

   If they say yes → proceed. If they correct it → use their answer.

4. **Fetch the Jira story.** Call `mcp__claude_ai_Atlassian__getJiraIssue` with cloudId `fb779f96-2443-4319-b441-63d66a63bbaf` to get the summary, description, and acceptance criteria. Use this to understand the resource, required fields, and validation rules — fill in `<model>`, `<resource>`, and field names in the templates below without asking the user to repeat what Jira already says.

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

## Final step — Session summary

After completing all steps, output a summary so the current session has a clear record:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ next-collection-route complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Story:    AIEX-NNN — <story summary>

Files created:
  app/api/<resource>/route.ts
  __tests__/api/<resource>/<resource>.test.ts

Tests:    npm run test — <passed / N failures>
Build:    npm run build — <clean / errors>

Next:     <suggested next step, e.g. "Run /next-dynamic-route for GET/PATCH/DELETE /api/<resource>/[id]">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
