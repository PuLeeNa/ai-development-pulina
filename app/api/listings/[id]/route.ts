// app/api/listings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { prisma } = await import("@/lib/prisma")
  const { authOptions } = await import("@/lib/auth")

  const [listing, session] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: { seller: { select: { username: true } } },
    }),
    getServerSession(authOptions),
  ])

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isOpen = listing.closingTime > new Date()
  const isEligibleBidder =
    isOpen &&
    !listing.cancelled &&
    !!session?.user?.id &&
    session.user.id !== listing.sellerId

  const userId = session?.user?.id as string

  const [bidderCount, ownBid, winnerBid] = await Promise.all([
    prisma.bid.count({ where: { listingId: id } }),
    isEligibleBidder
      ? prisma.bid.findUnique({
          where: { listingId_bidderId: { listingId: id, bidderId: userId } },
          select: { amount: true },
        })
      : Promise.resolve(null),
    !isOpen
      ? prisma.bid.findFirst({
          where: { listingId: id },
          orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
          include: { bidder: { select: { username: true } } },
        })
      : Promise.resolve(null),
  ])

  return NextResponse.json({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    photoUrl: listing.photoUrl,
    startingPrice: listing.startingPrice,
    closingTime: listing.closingTime,
    cancelled: listing.cancelled,
    seller: listing.seller,
    bidderCount,
    ...(ownBid ? { myBid: ownBid.amount } : {}),
    ...(!isOpen
      ? {
          closed: true,
          winner: winnerBid
            ? { winnerUsername: winnerBid.bidder.username, winningAmount: winnerBid.amount }
            : null,
        }
      : {}),
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({ where: { id } })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (listing.sellerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const bidCount = await prisma.bid.count({ where: { listingId: id } })
  if (bidCount > 0)
    return NextResponse.json({ error: "Cannot cancel a listing with bids" }, { status: 403 })

  await prisma.listing.update({
    where: { id },
    data: { cancelled: true },
  })

  return NextResponse.json({ success: true })
}
