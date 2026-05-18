---
name: prisma-schema-change
description: Safe, step-by-step workflow for making Prisma schema changes in this Next.js + Prisma 7 + adapter-pg project. Use this skill whenever you need to add a model, add a field, define a relation, or create a migration. Triggers on: "add a model", "add X to the schema", "create a Bid model", "update schema.prisma", "add a field to", "create a migration", "add relation between". Always use this before touching prisma/schema.prisma to avoid breaking the adapter-pg setup.
---

# Prisma Schema Change Workflow

This project uses **Prisma 7 + `@prisma/adapter-pg`** (not standard Prisma). The `lib/prisma.ts` singleton uses a `pg.Pool` adapter. Never reinstantiate the client; always import from `@/lib/prisma`.

## Step 1: Understand the change

Before touching any file, confirm:
- What model or field is being added/changed?
- What relations are needed? (current schema uses `ON DELETE RESTRICT`)
- Will this change affect any existing API routes?
- Does this represent an architectural decision worth recording in `ADR.md`?

Read `prisma/schema.prisma` to understand current state before editing.

## Step 2: Update `prisma/schema.prisma`

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

## Step 3: Generate the Prisma client

```bash
npx prisma generate
```

Required before TypeScript will compile against the new schema. Check the output confirms `Generated Prisma Client`.

## Step 4: Create the migration

```bash
npx prisma migrate dev --name <descriptive-name>
```

Use kebab-case names. Match the Jira ticket where applicable, e.g. `aiex-728-add-bid-model`.

Expected output: `The following migration(s) have been created and applied` and a new file under `prisma/migrations/`.

If the database isn't running locally, use `npx prisma db push` to push schema without migration history, then run `migrate dev` against a live DB later.

## Step 5: Update affected API routes

Check for routes with hardcoded values or stale comments about missing models:
- Comments like `// TODO until X model is added`
- Hardcoded `0` for counts that should now query the DB
- `select:` clauses missing new relation fields

Maintain the dynamic import pattern in all route handlers:
```typescript
const { prisma } = await import("@/lib/prisma")
```

For any new routes: `params` is `Promise<{ id: string }>` — must `await params`. Auth check before DB writes: `await import("@/lib/auth")` + `getServerSession(authOptions)`.

## Step 6: Update or create tests

Tests live in `__tests__/api/`. Follow the mock pattern exactly:

```typescript
const mockCreate = jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: { newModel: { create: mockCreate } }
}))
jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}))

// For dynamic routes: mock params as a resolved Promise
const mockParams = { params: Promise.resolve({ id: "test-id" }) }
```

Run tests:
```bash
npm run test
```

## Step 7: Verify the build

```bash
npm run build
```

This runs `prisma generate && next build`. A clean build confirms TypeScript is satisfied with all changes.

## Step 8: Consider an ADR

If this change represents an architectural decision (new cascade rule, new access pattern, new enforcement strategy), add an entry to `ADR.md`:

```markdown
## ADR-NNN: Title

**Decision:** What was chosen.
**Reasoning:**
- Reason 1
- Reason 2
**Trade-off:** What this costs or limits.
```

Check the highest existing ADR number and increment by 1.

---

## Migration naming reference

| Change | Example name |
|--------|-------------|
| Add model | `aiex-728-add-bid-model` |
| Add field | `add-cancelled-to-listing` |
| Add relation | `link-bids-to-listings` |
| Rename field | `rename-price-to-starting-price` |
