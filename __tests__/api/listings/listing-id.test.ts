// __tests__/api/listings/listing-id.test.ts
import { GET, DELETE } from "@/app/api/listings/[id]/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
const mockCount = jest.fn()
const mockBidFindUnique = jest.fn()
const mockBidFindFirst = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    bid: {
      count: mockCount,
      findUnique: mockBidFindUnique,
      findFirst: mockBidFindFirst,
    },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const params = { params: Promise.resolve({ id: "listing-1" }) }

const mockListing = {
  id: "listing-1",
  title: "Air Max",
  description: "Rare pair",
  photoUrl: "http://img.com/1.jpg",
  startingPrice: 150,
  closingTime: new Date("2099-01-01"),
  cancelled: false,
  sellerId: "u1",
  seller: { username: "seller1" },
  createdAt: new Date(),
}

const mockClosedListing = {
  ...mockListing,
  closingTime: new Date("2000-01-01"),
}

describe("GET /api/listings/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    mockBidFindFirst.mockResolvedValue(null)
  })

  it("returns 404 when listing not found", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(404)
  })

  it("returns listing with seller.username and bidderCount 0", async () => {
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(0)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe("Air Max")
    expect(data.seller.username).toBe("seller1")
    expect(data.bidderCount).toBe(0)
    expect(data._count).toBeUndefined()
  })

  it("returns correct bidderCount when bids exist", async () => {
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(3)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(3)
    expect(data._count).toBeUndefined()
  })

  it("unauthenticated caller gets bidderCount only, no myBid", async () => {
    mockGetServerSession.mockResolvedValue(null)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(2)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(2)
    expect(data.myBid).toBeUndefined()
  })

  it("authenticated seller gets bidderCount only, no myBid", async () => {
    // mockListing.sellerId === "u1" — same id as session user
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(3)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(3)
    expect(data.myBid).toBeUndefined()
  })

  it("authenticated bidder with existing bid gets bidderCount and myBid", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(1)
    mockBidFindUnique.mockResolvedValue({ amount: 250 })
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(1)
    expect(data.myBid).toBe(250)
  })

  it("authenticated bidder with no bid gets bidderCount only, no myBid", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(0)
    mockBidFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.bidderCount).toBe(0)
    expect(data.myBid).toBeUndefined()
  })

  it("closed listing with winner returns closed:true and winner info", async () => {
    mockFindUnique.mockResolvedValue(mockClosedListing)
    mockCount.mockResolvedValue(2)
    mockBidFindFirst.mockResolvedValue({
      amount: 350,
      bidder: { username: "alice" },
    })
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.closed).toBe(true)
    expect(data.winner).toEqual({ winnerUsername: "alice", winningAmount: 350 })
    expect(mockBidFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { bidder: { select: { username: true } } },
      })
    )
  })

  it("closed listing with no bids returns closed:true and winner:null", async () => {
    mockFindUnique.mockResolvedValue(mockClosedListing)
    mockCount.mockResolvedValue(0)
    mockBidFindFirst.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.closed).toBe(true)
    expect(data.winner).toBeNull()
    expect(mockBidFindFirst).toHaveBeenCalled()
  })

  it("open listing does not include closed or winner fields", async () => {
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(1)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.closed).toBeUndefined()
    expect(data.winner).toBeUndefined()
    expect(mockBidFindFirst).not.toHaveBeenCalled()
  })

  it("closed listing winner query uses correct orderBy for tie-break", async () => {
    mockFindUnique.mockResolvedValue(mockClosedListing)
    mockCount.mockResolvedValue(1)
    mockBidFindFirst.mockResolvedValue({
      amount: 200,
      bidder: { username: "bob" },
    })
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    expect(mockBidFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
      })
    )
  })
})

describe("DELETE /api/listings/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    mockCount.mockResolvedValue(0)
  })

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(401)
  })

  it("returns 403 when non-seller attempts to cancel", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "other-user" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Forbidden")
  })

  it("cancels listing and returns 200 when seller with zero bids", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockUpdate.mockResolvedValue({ ...mockListing, cancelled: true })
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: { cancelled: true },
    })
  })

  it("returns 403 when seller tries to cancel listing with bids", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockFindUnique.mockResolvedValue(mockListing)
    mockCount.mockResolvedValue(2)
    const res = await DELETE(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Cannot cancel a listing with bids")
  })
})
