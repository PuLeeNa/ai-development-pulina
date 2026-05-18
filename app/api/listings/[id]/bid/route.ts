// app/api/listings/[id]/bid/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)

  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const amount = Number(body.amount)

  if (body.amount === undefined || body.amount === null || isNaN(amount))
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({ where: { id } })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (listing.cancelled || new Date(listing.closingTime) <= new Date())
    return NextResponse.json({ error: "Auction has closed" }, { status: 403 })

  if (listing.sellerId === session.user.id)
    return NextResponse.json({ error: "You cannot bid on your own listing" }, { status: 403 })

  if (amount < listing.startingPrice)
    return NextResponse.json({ error: "Bid must meet the starting price" }, { status: 400 })

  await prisma.bid.upsert({
    where: { listingId_bidderId: { listingId: id, bidderId: session.user.id } },
    create: { listingId: id, bidderId: session.user.id, amount },
    update: { amount },
  })

  const bidderCount = await prisma.bid.count({ where: { listingId: id } })
  return NextResponse.json({ bidderCount }, { status: 201 })
}
