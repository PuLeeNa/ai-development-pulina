# AIEX-706: User Registration — Implementation Spec

**Date:** 2026-05-12
**Jira:** AIEX-706 (Story under AIEX-705 User Authentication)
**Stack:** Next.js (App Router, TypeScript) + Prisma + Supabase Postgres + NextAuth Credentials

---

## Approach

NextAuth owns signin and session management. Registration is a plain API route
(`POST /api/auth/signup`) that validates input, checks uniqueness, hashes the password,
and creates the User record. The page then calls `signIn()` client-side to auto-authenticate
on success and redirect to `/listings`.

---

## Scaffolding

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

npm install prisma @prisma/client bcryptjs next-auth
npm install -D @types/bcryptjs
npx prisma init
```

---

## File Structure

```
/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   └── [...nextauth]/route.ts
│   │   └── listings/                   ← future stories
│   ├── auth/
│   │   └── signup/page.tsx
│   └── layout.tsx
├── lib/
│   ├── prisma.ts
│   └── auth.ts
├── prisma/
│   └── schema.prisma
├── types/
│   └── next-auth.d.ts
└── .env
```

---

## Environment Variables

```
DATABASE_URL="postgresql://..."      # Supabase → Settings → Database → Connection string
NEXTAUTH_SECRET="..."                # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma
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

> `listings` and `bids` relations are added in AIEX-716 and AIEX-728 respectively,
> when those models are introduced. Do not add them here — Prisma will fail to
> migrate if referenced models don't exist.

Migration: `npx prisma migrate dev --name init`

---

## lib/prisma.ts

Singleton to avoid exhausting Supabase connections in dev hot-reload:

```ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prisma
```

---

## lib/auth.ts

```ts
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

---

## app/api/auth/[...nextauth]/route.ts

```ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

---

## app/api/auth/signup/route.ts

```ts
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

---

## app/auth/signup/page.tsx

```tsx
"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignUpPage() {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
      setErrors({ form: data.error })
      return
    }

    await signIn("credentials", { email, password, redirect: false })
    router.push("/listings")
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Create account</h1>
        {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}
        <input name="email" type="email" placeholder="Email" required
          className="border rounded px-3 py-2" />
        <input name="username" type="text" placeholder="Username" required
          className="border rounded px-3 py-2" />
        <input name="password" type="password" placeholder="Password" required
          className="border rounded px-3 py-2" />
        <button type="submit"
          className="bg-black text-white rounded px-3 py-2 font-medium">
          Sign up
        </button>
        <p className="text-sm text-center">
          Already have an account?{" "}
          <Link href="/auth/signin" className="underline">Sign in</Link>
        </p>
      </form>
    </main>
  )
}
```

---

## types/next-auth.d.ts

```ts
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

---

## Acceptance Criteria

- Given valid, unique email, username, and password → User created, signed in, redirected to /listings
- Given duplicate email → 400 "Email already in use"
- Given duplicate username → 400 "Username already taken"
- Given missing field → 400 "All fields are required"

---

## Out of Scope

- Password strength validation
- Email verification
- OAuth / social login
- /auth/signin page (covered by AIEX-712)