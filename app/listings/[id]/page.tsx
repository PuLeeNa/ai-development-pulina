// app/listings/[id]/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Navbar from "@/app/components/Navbar"
import CountdownTimer from "@/app/components/CountdownTimer"
import CancelButton from "@/app/components/CancelButton"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: { username: true } } },
    }),
    getServerSession(authOptions),
  ])

  if (!listing || listing.cancelled) redirect("/listings")

  const isSeller = session?.user?.id === listing.sellerId
  const isOpen = new Date(listing.closingTime) > new Date()
  // bidCount is 0 until Bid model is added in AIEX-728
  const bidCount = 0
  const canCancel = isSeller && bidCount === 0 && isOpen

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
        >
          ← Back to auctions
        </Link>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="aspect-video bg-zinc-800">
            <img
              src={listing.photoUrl}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-white">{listing.title}</h1>
              <CountdownTimer closingTime={listing.closingTime.toISOString()} />
            </div>
            <p className="text-zinc-400">{listing.description}</p>
            <div className="flex items-center gap-6 py-4 border-t border-zinc-800">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide">Starting price</p>
                <p className="text-amber-400 text-xl font-bold">${listing.startingPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide">Listed by</p>
                <p className="text-white font-medium">@{listing.seller.username}</p>
              </div>
            </div>
            {canCancel && (
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs mb-3">No bids placed yet — you can still cancel.</p>
                <CancelButton listingId={listing.id} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}