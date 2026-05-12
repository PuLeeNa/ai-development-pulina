// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/prisma")
  const { email, username, password } = await req.json()

  if (!email || !username || !password)
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (existing?.email === email)
    return NextResponse.json({ error: "Email already in use" }, { status: 400 })
  if (existing?.username === username)
    return NextResponse.json({ error: "Username already taken" }, { status: 400 })

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
  })

  return NextResponse.json({ id: user.id, username: user.username }, { status: 201 })
}