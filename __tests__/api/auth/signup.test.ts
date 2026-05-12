// __tests__/api/auth/signup.test.ts
import { POST } from "@/app/api/auth/signup/route"
import { NextRequest } from "next/server"

const mockFindFirst = jest.fn()
const mockCreate = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: mockFindFirst,
      create: mockCreate,
    },
  },
}))

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}))

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ email: "a@a.com" }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("All fields are required")
  })

  it("returns 400 when email is already in use", async () => {
    mockFindFirst.mockResolvedValue({ email: "a@a.com", username: "other" })
    const res = await POST(
      makeRequest({ email: "a@a.com", username: "newuser", password: "pass" })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Email already in use")
  })

  it("returns 400 when username is already taken", async () => {
    mockFindFirst.mockResolvedValue({ email: "other@other.com", username: "taken" })
    const res = await POST(
      makeRequest({ email: "new@new.com", username: "taken", password: "pass" })
    )
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe("Username already taken")
  })

  it("creates user and returns 201 on valid input", async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: "cuid1", username: "newuser" })
    const res = await POST(
      makeRequest({ email: "new@new.com", username: "newuser", password: "pass123" })
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.username).toBe("newuser")
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "new@new.com",
        username: "newuser",
        passwordHash: "hashed_password",
      },
    })
  })
})