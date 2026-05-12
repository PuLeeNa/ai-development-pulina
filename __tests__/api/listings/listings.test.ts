// __tests__/api/listings/listings.test.ts
import { GET, POST } from "@/app/api/listings/route"
import { NextRequest } from "next/server"

const mockFindMany = jest.fn()
const mockCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: mockFindMany,
      create: mockCreate,
    },
  },
}))

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

function makePostRequest(body: object) {
  return new NextRequest("http://localhost/api/listings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("GET /api/listings", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns all non-cancelled listings ordered by closingTime", async () => {
    const listings = [
      { id: "1", title: "Air Max", photoUrl: "http://img.com/1.jpg", startingPrice: 100, closingTime: new Date("2026-06-01"), sellerId: "u1", createdAt: new Date() },
    ]
    mockFindMany.mockResolvedValue(listings)
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cancelled: false },
        orderBy: { closingTime: "asc" },
      })
    )
  })
})

describe("POST /api/listings", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makePostRequest({ title: "t", description: "d", photoUrl: "http://p.com", startingPrice: 100, closingTime: new Date(Date.now() + 3600000).toISOString() }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when required fields are missing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    const res = await POST(makePostRequest({ title: "t" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("All fields are required")
  })

  it("returns 400 when startingPrice is zero", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    const res = await POST(makePostRequest({
      title: "t", description: "d", photoUrl: "http://p.com",
      startingPrice: 0, closingTime: new Date(Date.now() + 3600000).toISOString(),
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Starting price must be greater than zero")
  })

  it("returns 400 when closingTime is in the past", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    const res = await POST(makePostRequest({
      title: "t", description: "d", photoUrl: "http://p.com",
      startingPrice: 100, closingTime: new Date(Date.now() - 3600000).toISOString(),
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Closing time must be in the future")
  })

  it("creates listing and returns 201 with id on valid input", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } } as any)
    mockCreate.mockResolvedValue({ id: "listing-1" })
    const closingTime = new Date(Date.now() + 3600000).toISOString()
    const res = await POST(makePostRequest({
      title: "Air Max", description: "Rare pair", photoUrl: "http://img.com/1.jpg",
      startingPrice: 150, closingTime,
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe("listing-1")
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sellerId: "u1", title: "Air Max", startingPrice: 150 }),
    }))
  })
})