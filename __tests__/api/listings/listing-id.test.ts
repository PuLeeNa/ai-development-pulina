// __tests__/api/listings/listing-id.test.ts
import { GET, DELETE } from "@/app/api/listings/[id]/route"
import { NextRequest } from "next/server"

const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mockFindUnique,
      update: mockUpdate,
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

describe("GET /api/listings/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 404 when listing not found", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(404)
  })

  it("returns listing with seller.username and bidCount 0", async () => {
    mockFindUnique.mockResolvedValue(mockListing)
    const res = await GET(new NextRequest("http://localhost/api/listings/listing-1"), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.title).toBe("Air Max")
    expect(data.seller.username).toBe("seller1")
    expect(data.bidCount).toBe(0)
  })
})

describe("DELETE /api/listings/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

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
})