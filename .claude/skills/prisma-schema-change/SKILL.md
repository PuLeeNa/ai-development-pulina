---
name: prisma-schema-change
description: Guides safe Prisma schema changes in this Next.js 16 + Prisma 7 + adapter-pg project — adding models, fields, relations, and migrations. Use this skill whenever the user mentions adding a model, changing the schema, creating a migration, adding a relation, or touching prisma/schema.prisma. Also use when starting work on any Jira story that involves a new database model (e.g. Bid, User, Listing). Always invoke before any schema edit to prevent adapter-pg setup breakage.
---

# Prisma Schema Change Workflow

This project uses **Prisma 7 + `@prisma/adapter-pg`** — the client initialises via a `pg.Pool` adapter, not the standard `new PrismaClient()`. Always import from `@/lib/prisma`; never reinstantiate.

## Step 0 — Story verification

**Resolve the story ID, then confirm with the user.**

1. **Check current session first.** If a Jira story ID (e.g. AIEX-728) is already present in the conversation context or active task, use that as the candidate.

2. **Fall back to branch name.** If no ID is in session, run `git branch --show-current` and parse the ticket from the branch name (format: `feature/AIEX-NNN-...`; use the first ticket number found).

3. **Always confirm with the user.** Whether the ID came from session or branch, ask:

   > "I have you working on `<AIEX-NNN>` — is that right?"

   If they say yes → proceed. If they correct it → use their answer.

4. **Fetch the Jira story.** Call `mcp__claude_ai_Atlassian__getJiraIssue` with cloudId `fb779f96-2443-4319-b441-63d66a63bbaf` to get the summary, description, and acceptance criteria. Use this to understand what model, fields, and relations are needed — don't ask the user to repeat what Jira already says.

## Step 1 — Understand the change

Before touching any file, confirm (using the story context where available):
- What model or field is being added/changed?
- What relations are needed? (current schema uses `ON DELETE RESTRICT`)
- Will this affect any existing API routes?
- Does this represent an architectural decision worth recording in `ADR.md`?

Read `prisma/schema.prisma` to understand current state before editing.

## Step 2 — Update `prisma/schema.prisma`

Follow existing conventions exactly:

```prisma
model NewModel {
  id        String   @id @default(cuid())   // always cuid
  createdAt DateTime @default(now())         // always present

  // relations: explicit @relation with fields + references
  userId    String
  user      User     @relation(fields: [userId], references: [id])
}
```

If the new model is referenced by an existing model, add the back-relation:
```prisma
// In existing model:
newModels  NewModel[]
```

## Step 3 — Generate the Prisma client

```bash
npx prisma generate
```

Required before TypeScript will compile against the new schema. Confirm output says `Generated Prisma Client`.

## Step 4 — Create the migration

```bash
npx prisma migrate dev --name <descriptive-name>
```

Use kebab-case names matching the Jira ticket where applicable, e.g. `aiex-728-add-bid-model`.

Expected: `The following migration(s) have been created and applied` + new file under `prisma/migrations/`.

If the database isn't running locally, use `npx prisma db push` to push schema without migration history, then run `migrate dev` against a live DB later.

## Step 5 — Update affected API routes

Check for routes with stale hardcoded values or comments about missing models:
- Comments like `// TODO until X model is added`
- Hardcoded `0` for counts that should now query the DB
- `select:` clauses missing new relation fields

Maintain the dynamic import pattern:
```typescript
const { prisma } = await import("@/lib/prisma")
```

For new routes: `params` is `Promise<{ id: string }>` — must `await params`. Auth check before DB writes.

## Step 6 — Update or create tests

Tests live in `__tests__/api/`. Follow the mock pattern:

```typescript
const mockCreate = jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: { newModel: { create: mockCreate } }
}))
jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}))
// For dynamic routes: mock params as Promise.resolve
const mockParams = { params: Promise.resolve({ id: "test-id" }) }
```

```bash
npm run test
```

## Step 7 — Verify the build

```bash
npm run build
```

Clean build confirms TypeScript is satisfied with all changes.

## Step 8 — Consider an ADR

If this represents an architectural decision (new cascade rule, new access pattern, new enforcement strategy), add an entry to `ADR.md`:

```markdown
## ADR-NNN: Title
**Decision:** What was chosen.
**Reasoning:**
- Reason 1
**Trade-off:** What this costs or limits.
```

---

## Final step — Session summary

After completing all steps, output a summary so the current session has a clear record:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ prisma-schema-change complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Story:      AIEX-NNN — <story summary>
Migration:  prisma/migrations/<timestamp>_<name>/migration.sql

Files modified:
  prisma/schema.prisma        — added <ModelName> model
  <route file if updated>     — updated to use real <field>

Files created:
  <new route file if any>
  <new test file if any>

Tests:      npm run test — <passed / N failures>
Build:      npm run build — <clean / errors>

Next:       <suggested next step, e.g. "Run /next-collection-route for POST /api/bids">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Migration naming reference

| Change | Example name |
|--------|-------------|
| Add model | `aiex-728-add-bid-model` |
| Add field | `add-cancelled-to-listing` |
| Add relation | `link-bids-to-listings` |
