// lib/base-url.ts
// Returns the correct base URL for server-side fetch calls.
// VERCEL_URL is automatically injected by Vercel on every deployment.
export function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000"
}