// lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })
          if (!user) return null
          const valid = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!valid) return null
          // NextAuth's built-in `name` field carries username into the JWT
          return { id: user.id, email: user.email, name: user.username }
        } catch (err) {
          console.error("[authorize] Prisma error:", err)
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).name
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
}
