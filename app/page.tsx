import Link from "next/link";
import Navbar from "./components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <Navbar />

      {/* Hero */}
      <section
        className="relative flex min-h-[calc(100vh-73px)] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[600px] w-[600px] rounded-full bg-amber-400/5 blur-3xl" />
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center gap-8">
          <div className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Blind Auction Platform
          </div>

          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-7xl lg:text-8xl">
            Sealed bids.
            <br />
            <span className="text-zinc-400">No leaderboards.</span>
            <br />
            No sniping.
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
            Submit your true price. The highest bid wins — revealed only at
            close.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/listings"
              className="rounded-full bg-amber-400 px-8 py-3.5 text-base font-bold text-zinc-950 transition-colors hover:bg-amber-300"
            >
              Browse Auctions
            </Link>
            <Link
              href="/listings/new"
              className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-base font-bold text-white transition-colors hover:border-white/40 hover:bg-white/10"
            >
              Create a Listing
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 text-zinc-400">
              Three steps. No gamesmanship. Pure price discovery.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 transition-colors hover:border-amber-400/30 hover:bg-white/[0.07]">
              <div className="mb-5 text-4xl">🔒</div>
              <h3 className="mb-3 text-lg font-bold text-white">
                Place your sealed bid
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Your amount stays hidden from everyone, including the seller.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 transition-colors hover:border-amber-400/30 hover:bg-white/[0.07]">
              <div className="mb-5 text-4xl">👁</div>
              <h3 className="mb-3 text-lg font-bold text-white">
                Watch the competition
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                See how many bidders are in — never what they bid.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 transition-colors hover:border-amber-400/30 hover:bg-white/[0.07]">
              <div className="mb-5 text-4xl">🏆</div>
              <h3 className="mb-3 text-lg font-bold text-white">
                Winner revealed at close
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Highest bid wins. Everyone sees the result at the same moment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <p className="text-sm text-zinc-600">© 2026 Sneaker Drop</p>
        </div>
      </footer>
    </div>
  );
}