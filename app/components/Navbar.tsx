import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <span className="text-xl font-black tracking-widest text-white uppercase">
          Sneaker Drop
        </span>
        <nav className="flex items-center gap-6">
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
        </nav>
      </div>
    </header>
  );
}