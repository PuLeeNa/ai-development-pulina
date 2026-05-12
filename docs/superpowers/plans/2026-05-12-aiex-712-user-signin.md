# AIEX-712: User Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/auth/signin` page that lets registered users sign in with email and password, with inline error handling and automatic redirect for already-authenticated users.

**Architecture:** Single `"use client"` component at `app/auth/signin/page.tsx`. NextAuth's `CredentialsProvider` is already wired up in `lib/auth.ts` — no API routes needed. The form calls `signIn("credentials", { redirect: false })` and handles errors inline. `useSession()` + `useEffect` redirects already-authenticated visitors to `/listings` before rendering the form.

**Tech Stack:** Next.js 16 (App Router, TypeScript), NextAuth v4 (`next-auth/react`), Tailwind CSS v4

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/auth/signin/page.tsx` | Create | Sign-in form, inline error display, session-based redirect |

---

## Task 1: Create the Sign-In Page

**Files:**
- Create: `app/auth/signin/page.tsx`

- [ ] **Step 1: Create `app/auth/signin/page.tsx`**

```tsx
// app/auth/signin/page.tsx
"use client"
import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function SignInPage() {
  const router = useRouter()
  const { status } = useSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "authenticated") router.push("/listings")
  }, [status, router])

  if (status === "loading") return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string

    const result = await signIn("credentials", { email, password, redirect: false })

    if (result?.error) {
      setError("Invalid email or password")
      return
    }

    router.push("/listings")
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">Sign In</h1>
            <p className="text-zinc-400 text-sm mt-1">Welcome back.</p>
          </div>
          {error && (
            <p className="text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <button
              type="submit"
              className="w-full bg-amber-400 text-black rounded-lg px-4 py-3 font-semibold hover:bg-amber-300 transition-colors"
            >
              Sign in
            </button>
          </form>
          <p className="text-sm text-center text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-amber-400 hover:text-amber-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "c:\projects\claudeproject\ai-development-pulina"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run existing tests — verify nothing is broken**

```bash
npm test
```

Expected: 4 passed, 0 failed (the signup API route tests from AIEX-706).

- [ ] **Step 4: Commit**

```bash
git add app/auth/signin/page.tsx
git commit -m "feat(AIEX-712): add signin page with inline error handling and session redirect"
```

---

## Task 2: Manual End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test happy path**

1. Navigate to http://localhost:3000/auth/signin
2. Enter the credentials of a user registered in AIEX-706 (e.g. `test@example.com` / `password123`)
3. Click **Sign in**
4. Expected: redirected to `/listings` (shows 404 — that page is built in AIEX-724, expected)

- [ ] **Step 3: Test wrong password**

1. Navigate back to http://localhost:3000/auth/signin
2. Enter a valid email with a wrong password
3. Expected: inline error "Invalid email or password" appears — no page reload, no URL change

- [ ] **Step 4: Test unknown email**

1. Enter an email that doesn't exist in the database
2. Expected: same inline error "Invalid email or password"

- [ ] **Step 5: Test already-signed-in redirect**

1. While session is active (after signing in), navigate to http://localhost:3000/auth/signin
2. Expected: immediately redirected to `/listings` — sign-in form never renders

- [ ] **Step 6: Test link to signup**

1. On the signin page, click **Sign up**
2. Expected: navigates to `/auth/signup`

- [ ] **Step 7: Final commit if any changes remain**

```bash
git status
```

If any uncommitted changes:
```bash
git add .
git commit -m "feat(AIEX-712): complete user signin story"
```