// app/listings/[id]/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Navbar from "@/app/components/Navbar"
import CountdownTimer from "@/app/components/CountdownTimer"
import CancelButton from "@/app/components/CancelButton"
import BidForm from "@/app/components/BidForm"
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

  const [existingBid, bidderCount, winnerBid] = await Promise.all([
    session?.user?.id && session.user.id !== listing.sellerId
      ? prisma.bid.findUnique({
          where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
          select: { amount: true },
        })
      : Promise.resolve(null),
    prisma.bid.count({ where: { listingId: id } }),
    !isOpen
      ? prisma.bid.findFirst({
          where: { listingId: id },
          orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
          include: { bidder: { select: { username: true } } },
        })
      : Promise.resolve(null),
  ])

  const canCancel = isSeller && bidderCount === 0 && isOpen

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
              {isOpen && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">Bidders</p>
                  <p className="text-white font-medium">{bidderCount}</p>
                </div>
              )}
            </div>
            {canCancel && (
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs mb-3">No bids placed yet — you can still cancel.</p>
                <CancelButton listingId={listing.id} />
              </div>
            )}
            {!isSeller && isOpen && session && (
              <div className="pt-4 border-t border-zinc-800">
                {existingBid && (
                  <p className="text-zinc-400 text-sm mb-3">
                    Your current bid:{" "}
                    <span className="text-amber-400 font-semibold">
                      ${existingBid.amount.toLocaleString()}
                    </span>
                  </p>
                )}
                <BidForm
                  listingId={listing.id}
                  startingPrice={listing.startingPrice}
                  existingBid={existingBid?.amount}
                />
              </div>
            )}
            {!isOpen && (
              <div className="pt-4 border-t border-zinc-800">
                {winnerBid ? (
                  winnerBid.bidderId === session?.user?.id ? (
                    <>
                      <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Auction Result</p>
                      <p className="text-amber-400 font-bold text-lg">You won!</p>
                      <p className="text-amber-400 text-2xl font-bold mt-1">
                        ${winnerBid.amount.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Auction Result</p>
                      <p className="text-white text-sm">
                        Winner:{" "}
                        <span className="text-amber-400 font-bold">@{winnerBid.bidder.username}</span>
                      </p>
                      <p className="text-amber-400 text-2xl font-bold mt-1">
                        ${winnerBid.amount.toLocaleString()}
                      </p>
                      {existingBid && (
                        <p className="text-zinc-400 text-sm mt-3">
                          You bid:{" "}
                          <span className="text-zinc-300 font-semibold">
                            ${existingBid.amount.toLocaleString()}
                          </span>
                        </p>
                      )}
                    </>
                  )
                ) : (
                  <p className="text-zinc-500 text-sm">No bids were placed.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
