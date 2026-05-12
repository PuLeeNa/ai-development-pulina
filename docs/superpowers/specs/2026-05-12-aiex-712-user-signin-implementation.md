# AIEX-712: User Sign-In — Implementation Spec

**Date:** 2026-05-12
**Jira:** AIEX-712 (Story under AIEX-705 User Authentication)
**Subtasks:** AIEX-713 (signin page), AIEX-714 (error handling)
**Stack:** Next.js 16 (App Router, TypeScript), NextAuth v4, Tailwind CSS v4

---

## Approach

Single `"use client"` component at `app/auth/signin/page.tsx`. NextAuth's `CredentialsProvider` is already configured in `lib/auth.ts` — no new API routes needed. The page calls `signIn("credentials", { redirect: false })` and handles errors inline. Already-authenticated users are redirected to `/listings` via `useSession()` + `useEffect`.

---

## File

| File | Action | Responsibility |
|---|---|---|
| `app/auth/signin/page.tsx` | Create | Sign-in form, error display, session-based redirect |

No other files are modified.

---

## Component Design

```
app/auth/signin/page.tsx  ("use client")
  │
  ├── useSession()
  │     ├── useEffect: if status === "authenticated" → router.push("/listings")
  │     └── if status === "loading" → return null (prevent form flash)
  │
  ├── useState<string | null>(null)  ← error message
  │
  ├── handleSubmit(e)
  │     ├── e.preventDefault()
  │     ├── setError(null)
  │     ├── signIn("credentials", { email, password, redirect: false })
  │     ├── if result?.error → setError("Invalid email or password")
  │     └── if !result?.error → router.push("/listings")
  │
  └── JSX (dark card, no navbar — auth pages are nav-free)
        ├── bg-zinc-950 min-h-screen flex items-center justify-center
        ├── w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8
        ├── Heading: "Sign In" (text-3xl font-bold text-white tracking-tight, centered)
        ├── Subtext: "Welcome back." (text-zinc-400 text-sm, centered)
        ├── Error block (text-red-400 bg-red-400/10, shown when error !== null)
        ├── Email input (dark style)
        ├── Password input (dark style)
        ├── Submit button: full-width amber "Sign in"
        └── "Don't have an account? Sign up" → /auth/signup (amber link)
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Wrong password | `signIn` returns `{ error: "CredentialsSignin" }` → display "Invalid email or password" |
| Unknown email | Same — no distinction between wrong email vs wrong password |
| Empty field | HTML `required` attribute prevents submission |
| Already signed in | `useSession` detects `status === "authenticated"` → redirect to `/listings` |

Error is cleared (`setError(null)`) at the start of every submit attempt.

---

## Styling (matches signup page exactly)

- Background: `bg-zinc-950 min-h-screen flex items-center justify-center px-4`
- Card: `w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8`
- Inputs: `bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent`
- Button: `w-full bg-amber-400 text-black rounded-lg px-4 py-3 font-semibold hover:bg-amber-300 transition-colors`
- Error: `text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm`
- Links: `text-amber-400 hover:text-amber-300`

---

## Acceptance Criteria

- Given correct email and password → session created, redirected to `/listings`
- Given wrong password → inline "Invalid email or password" (no page reload)
- Given unregistered email → same inline error
- Given already-authenticated user visiting `/auth/signin` → redirected to `/listings`

---

## Out of Scope

- "Forgot password" / password reset
- Remember me / persistent sessions
- OAuth / social login