// app/api/listings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { seller: { select: { username: true } } },
  })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const bidCount = await prisma.bid.count({ where: { listingId: id } })
  return NextResponse.json({ ...listing, bidCount })
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
