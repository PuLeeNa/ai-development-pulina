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