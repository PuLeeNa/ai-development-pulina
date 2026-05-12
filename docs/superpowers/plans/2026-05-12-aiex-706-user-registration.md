# AIEX-706: User Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js app and implement user registration with email, username, and bcrypt-hashed password, backed by Supabase Postgres via Prisma and sessions via NextAuth.

**Architecture:** Registration is handled by a plain API route (`POST /api/auth/signup`) that validates input, checks uniqueness, hashes the password with bcrypt, and creates a User record. On success the page calls NextAuth's `signIn()` to auto-authenticate and redirect to `/listings`. NextAuth owns signin and JWT sessions for all other stories.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Prisma, Supabase Postgres, NextAuth v4, bcryptjs, Tailwind CSS, Jest (unit tests)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | User model definition |
| `.env` | Create | DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL |
| `.env.example` | Create | Placeholder env vars (no secrets) |
| `lib/prisma.ts` | Create | Prisma client singleton |
| `lib/auth.ts` | Create | NextAuth config with CredentialsProvider |
| `app/api/auth/[...nextauth]/route.ts` | Create | NextAuth route handler |
| `app/api/auth/signup/route.ts` | Create | Registration endpoint |
| `app/auth/signup/page.tsx` | Create | Registration UI |
| `types/next-auth.d.ts` | Create | Session type augmentation |
| `app/providers.tsx` | Create | Client-side SessionProvider wrapper |
| `jest.config.ts` | Create | Jest configuration for Next.js App Router |
| `__tests__/api/auth/signup.test.ts` | Create | Unit tests for signup route |

---

## Task 1: Scaffold Next.js App

**Files:**
- Creates all base Next.js files in project root

- [ ] **Step 1: Run create-next-app**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

When prompted, accept all defaults. This installs Next.js, React, TypeScript, Tailwind, and ESLint.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install prisma @prisma/client bcryptjs next-auth
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Initialise Prisma**

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

- [ ] **Step 4: Verify the app starts**

```bash
npm run dev
```

Expected: server starts at http://localhost:3000 with default Next.js homepage. Stop with Ctrl+C.

- [ ] **Step 5: Commit scaffold**

```bash
git add .
git commit -m "feat(AIEX-706): scaffold Next.js app with Tailwind, Prisma, NextAuth"
```

---

## Task 2: Set Up Jest

**Files:**
- Create: `jest.config.ts`
- Create: `__tests__/` directory

- [ ] **Step 1: Install Jest dependencies**

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

- [ ] **Step 2: Create jest.config.ts**

```ts
// jest.config.ts
import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
}

export default createJestConfig(config)
```

- [ ] **Step 3: Add test script to package.json**

Open `package.json` and add to the `"scripts"` section:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 4: Verify Jest runs**

```bash
npm test -- --passWithNoTests
```

Expected output:
```
Test Suites: 0 passed, 0 total
Tests:       0 passed, 0 total
```

- [ ] **Step 5: Commit**

```bash
git add jest.config.ts package.json package-lock.json
git commit -m "feat(AIEX-706): add Jest configuration for Next.js App Router"
```

---

## Task 3: Configure Environment and Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `.env` (already exists from `prisma init` — update it)
- Create: `.env.example`

- [ ] **Step 1: Add env vars to .env**

Open `.env` and replace its contents with:

```
DATABASE_URL="postgresql://postgres:<password>@<host>:5432/postgres?sslmode=require"
NEXTAUTH_SECRET="replace-with-output-of-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

Get the `DATABASE_URL` from: Supabase Dashboard → your project → Settings → Database → Connection string → URI. Replace `[YOUR-PASSWORD]` with your Supabase database password.

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

- [ ] **Step 2: Create .env.example**

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 3: Ensure .env is in .gitignore**

Open `.gitignore` and verify `.env` is listed. If not, add it:
```
.env
.env.local
```

- [ ] **Step 4: Replace prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

Note: `listings` and `bids` relations will be added in AIEX-716 and AIEX-728. Do not add them here.

- [ ] **Step 5: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected:
```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

If this fails, verify DATABASE_URL is correct and Supabase allows connections from your IP (Settings → Database → Connection pooling / Network).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma .env.example .gitignore
git commit -m "feat(AIEX-706): add User model and run initial Prisma migration"
```

---

## Task 4: Create Prisma Singleton

**Files:**
- Create: `lib/prisma.ts`

- [ ] **Step 1: Create lib/prisma.ts**

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/prisma.ts
git commit -m "feat(AIEX-706): add Prisma client singleton"
```

---

## Task 5: TDD — Signup API Route

**Files:**
- Create: `__tests__/api/auth/signup.test.ts`
- Create: `app/api/auth/signup/route.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/auth/signup.test.ts
import { POST } from "@/app/api/auth/signup/route"
import { NextRequest } from "next/server"

const mockFindFirst = jest.fn()
const mockCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: mockFindFirst,
      create: mockCreate,
    },
  },
}))

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}))

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ email: "a@a.com" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("All fields are required")
  })

  it("returns 400 when email is already in use", async () => {
    mockFindFirst.mockResolvedValue({ email: "a@a.com", username: "other" })
    const res = await POST(
      makeRequest({ email: "a@a.com", username: "newuser", password: "pass" })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Email already in use")
  })

  it("returns 400 when username is already taken", async () => {
    mockFindFirst.mockResolvedValue({ email: "other@other.com", username: "taken" })
    const res = await POST(
      makeRequest({ email: "new@new.com", username: "taken", password: "pass" })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Username already taken")
  })

  it("creates user and returns 201 on valid input", async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: "cuid1", username: "newuser" })
    const res = await POST(
      makeRequest({ email: "new@new.com", username: "newuser", password: "pass123" })
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.username).toBe("newuser")
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "new@new.com",
        username: "newuser",
        passwordHash: "hashed_password",
      },
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- __tests__/api/auth/signup.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/auth/signup/route'`

- [ ] **Step 3: Create the signup route**

```ts
// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { email, username, password } = await req.json()

  if (!email || !username || !password)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (existing?.email === email)
    return NextResponse.json({ error: "Email already in use" }, { status: 400 })
  if (existing?.username === username)
    return NextResponse.json({ error: "Username already taken" }, { status: 400 })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
  })

  return NextResponse.json({ id: user.id, username: user.username }, { status: 201 })
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- __tests__/api/auth/signup.test.ts
```

Expected:
```
PASS __tests__/api/auth/signup.test.ts
  POST /api/auth/signup
    ✓ returns 400 when required fields are missing
    ✓ returns 400 when email is already in use
    ✓ returns 400 when username is already taken
    ✓ creates user and returns 201 on valid input

Tests: 4 passed, 4 total
```

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/signup/route.ts __tests__/api/auth/signup.test.ts
git commit -m "feat(AIEX-706): add POST /api/auth/signup route with tests"
```

---

## Task 6: Configure NextAuth

**Files:**
- Create: `types/next-auth.d.ts`
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create types/next-auth.d.ts**

```ts
// types/next-auth.d.ts
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username: string
      email: string
    }
  }
}
```

- [ ] **Step 2: Create lib/auth.ts**

```ts
// lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        // NextAuth's built-in `name` field carries username into the JWT
        return { id: user.id, email: user.email, name: user.username }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).name
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
}
```

- [ ] **Step 3: Create app/api/auth/[...nextauth]/route.ts**

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts app/api/auth/\[...nextauth\]/route.ts types/next-auth.d.ts
git commit -m "feat(AIEX-706): configure NextAuth CredentialsProvider and JWT session"
```

---

## Task 7: Implement Signup Page

**Files:**
- Modify: `app/layout.tsx` — wrap with SessionProvider
- Create: `app/auth/signup/page.tsx`

- [ ] **Step 1: Add SessionProvider to app/layout.tsx**

NextAuth requires a `SessionProvider` around the app for client-side session access. Open `app/layout.tsx` and update it:

```tsx
// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "@/app/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sneaker Drop",
  description: "Sealed-bid sneaker auctions",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create app/providers.tsx**

SessionProvider must be a client component:

```tsx
// app/providers.tsx
"use client"
import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

- [ ] **Step 3: Create app/auth/signup/page.tsx**

```tsx
// app/auth/signup/page.tsx
"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const username = form.get("username") as string
    const password = form.get("password") as string

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    await signIn("credentials", { email, password, redirect: false })
    router.push("/listings")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-80 bg-white p-8 rounded-xl shadow"
      >
        <h1 className="text-2xl font-bold">Create account</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <input
          name="username"
          type="text"
          placeholder="Username"
          required
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          className="bg-black text-white rounded px-3 py-2 font-medium hover:bg-gray-800 transition"
        >
          Sign up
        </button>
        <p className="text-sm text-center text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/signin" className="underline text-black">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Run all tests to confirm nothing is broken**

```bash
npm test
```

Expected: 4 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add app/auth/signup/page.tsx app/providers.tsx app/layout.tsx
git commit -m "feat(AIEX-706): add signup page with auto sign-in on success"
```

---

## Task 8: Manual End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Register a new user**

1. Open http://localhost:3000/auth/signup
2. Fill in: email (`test@example.com`), username (`testuser`), password (`password123`)
3. Click **Sign up**
4. Expected: redirected to `/listings` (will show 404 — `/listings` is built in AIEX-724, that's expected)

- [ ] **Step 3: Verify user in Supabase**

Open Supabase Dashboard → your project → Table Editor → `User` table.
Expected: one row with `email = test@example.com`, `username = testuser`, `passwordHash` starting with `$2b$`.

- [ ] **Step 4: Test duplicate email**

Navigate back to http://localhost:3000/auth/signup, submit with the same email.
Expected: error message "Email already in use" appears on the form.

- [ ] **Step 5: Test duplicate username**

Submit with a different email but same username (`testuser`).
Expected: error message "Username already taken" appears on the form.

- [ ] **Step 6: Test missing field**

Clear the username field and submit.
Expected: browser's built-in required-field validation stops submission (HTML `required` attribute).

- [ ] **Step 7: Final commit if any changes remain**

```bash
git status
```

If any uncommitted changes:
```bash
git add .
git commit -m "feat(AIEX-706): complete user registration story"
```
