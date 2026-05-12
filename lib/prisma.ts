// lib/prisma.ts
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  // Prisma v7 requires a driver adapter for the runtime PrismaClient.
  // The URL is no longer read from schema.prisma; it must be supplied here.
  const adapter = new PrismaPg(databaseUrl)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prisma