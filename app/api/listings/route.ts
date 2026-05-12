// app/api/listings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

export async function GET() {
  const { prisma } = await import("@/lib/prisma")
  const listings = await prisma.listing.findMany({
    where: { cancelled: false },
    orderBy: { closingTime: "asc" },
    select: {
      id: true,
      title: true,
      photoUrl: true,
      startingPrice: true,
      closingTime: true,
      sellerId: true,
      createdAt: true,
    },
  })
  return NextResponse.json(listings)
}

export async function POST(req: NextRequest) {
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, description, photoUrl, startingPrice, closingTime } = await req.json()

  if (!title || !description || !photoUrl || startingPrice == null || !closingTime)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })

  if (Number(startingPrice) <= 0)
    return NextResponse.json({ error: "Starting price must be greater than zero" }, { status: 400 })

  if (new Date(closingTime) <= new Date())
    return NextResponse.json({ error: "Closing time must be in the future" }, { status: 400 })

  const { prisma } = await import("@/lib/prisma")
  const listing = await prisma.listing.create({
    data: {
      sellerId: session.user.id,
      title,
      description,
      photoUrl,
      startingPrice: Number(startingPrice),
      closingTime: new Date(closingTime),
    },
  })

  return NextResponse.json({ id: listing.id }, { status: 201 })
}