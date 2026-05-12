"use client"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"

export default function Navbar() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-xl font-black tracking-widest text-white uppercase hover:text-amber-400 transition-colors"
        >
          Sneaker Drop
        </Link>
        <nav className="flex items-center gap-6">
          {status === "loading" ? (
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
          ) : session?.user ? (
            <>
              <span className="text-sm text-zinc-400">
                Hi, <span className="text-white font-medium">{session.user.username}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}