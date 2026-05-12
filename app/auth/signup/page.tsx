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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
              <p className="text-zinc-400 text-sm mt-1">Join the auction.</p>
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
                name="username"
                type="text"
                placeholder="Username"
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
                Create account
              </button>
            </form>
            <p className="text-sm text-center text-zinc-400">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-amber-400 hover:text-amber-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
    </div>
  )
}