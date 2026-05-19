// __tests__/api/listings/bid.test.ts
import { POST } from "@/app/api/listings/[id]/bid/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockUpsert = jest.fn()
const mockCount = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: { findUnique: mockFindUnique },
    bid: { upsert: mockUpsert, count: mockCount },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({ authOptions: {} }))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const params = { params: Promise.resolve({ id: "listing-1" }) }

const openListing = {
  id: "listing-1",
  sellerId: "seller-1",
  startingPrice: 100,
  closingTime: new Date("2099-01-01"),
  cancelled: false,
}

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/listings/listing-1/bid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/listings/[id]/bid", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(401)
  })

  it("returns 400 when amount is missing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    const res = await POST(makeRequest({}), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid amount")
  })

  it("returns 400 when amount is not a number", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    const res = await POST(makeRequest({ amount: "abc" }), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid amount")
  })

  it("returns 400 when amount is an empty string", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    const res = await POST(makeRequest({ amount: "" }), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid amount")
  })

  it("returns 400 when amount is a boolean", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    const res = await POST(makeRequest({ amount: false }), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Invalid amount")
  })

  it("returns 404 when listing not found", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(null)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(404)
  })

  it("returns 403 when listing is cancelled", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue({ ...openListing, cancelled: true })
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Auction has closed")
  })

  it("returns 403 when listing closingTime has passed", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue({ ...openListing, closingTime: new Date("2000-01-01") })
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("Auction has closed")
  })

  it("returns 403 when seller bids on own listing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "seller-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe("You cannot bid on your own listing")
  })

  it("returns 400 when amount is below startingPrice", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    const res = await POST(makeRequest({ amount: 50 }), params)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Bid must meet the starting price")
  })

  it("returns 201 with bidderCount on valid first bid", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 150 }), params)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.bidderCount).toBe(1)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { listingId_bidderId: { listingId: "listing-1", bidderId: "bidder-1" } },
      create: { listingId: "listing-1", bidderId: "bidder-1", amount: 150 },
      update: { amount: 150 },
    })
  })

  it("returns 201 with bidderCount unchanged on upsert (same bidder)", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 200 }), params)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.bidderCount).toBe(1)
  })

  it("accepts bid at exactly startingPrice", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 100 }), params)
    expect(res.status).toBe(201)
  })

  it("updates existing bid — upsert update clause contains only amount", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 200 }), params)
    expect(res.status).toBe(201)
    const call = mockUpsert.mock.calls[0][0]
    expect(call.update).toEqual({ amount: 200 })
    expect(call.update).not.toHaveProperty("createdAt")
  })

  it("accepts valid amount at starting price floor via upsert — no duplicate record", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "bidder-1" } } as any)
    mockFindUnique.mockResolvedValue(openListing)
    mockUpsert.mockResolvedValue({})
    mockCount.mockResolvedValue(1)
    const res = await POST(makeRequest({ amount: 100 }), params)
    expect(res.status).toBe(201)
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })
})
