// app/api/listings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { seller: { select: { username: true } } },
  })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  // bidCount is 0 until Bid model is added in AIEX-728
  return NextResponse.json({ ...listing, bidCount: 0 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
  })

  if (!listing)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (listing.sellerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // bidCount is always 0 until Bid model is added in AIEX-728
  const bidCount = 0
  if (bidCount > 0)
    return NextResponse.json({ error: "Cannot cancel a listing with bids" }, { status: 403 })

  await prisma.listing.update({
    where: { id: params.id },
    data: { cancelled: true },
  })

  return NextResponse.json({ success: true })
}