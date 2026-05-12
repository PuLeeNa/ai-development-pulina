"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navbar from "@/app/components/Navbar"

export default function NewListingPage() {
  const router = useRouter()
  const { status } = useSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin")
  }, [status, router])

  if (status === "loading") return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
    </div>
  )

  async function handleSubmit(e: React.BaseSyntheticEvent) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        photoUrl: form.get("photoUrl"),
        startingPrice: Number(form.get("startingPrice")),
        closingTime: new Date(form.get("closingTime") as string).toISOString(),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    const data = await res.json()
    router.push(`/listings/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-8">Create a Listing</h1>
        {error && (
          <p className="text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm mb-6">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Title</label>
            <input
              name="title"
              type="text"
              placeholder="Nike Air Max 95 OG"
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Description</label>
            <textarea
              name="description"
              placeholder="Describe the condition, size, and any notable details..."
              required
              rows={3}
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Photo URL</label>
            <input
              name="photoUrl"
              type="url"
              placeholder="https://..."
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Starting Price ($)</label>
            <input
              name="startingPrice"
              type="number"
              min="1"
              step="1"
              placeholder="100"
              required
              className="bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-zinc-400 text-sm font-medium">Closing Time</label>
            <input
              name="closingTime"
              type="datetime-local"
              required
              className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-amber-400 text-black rounded-lg px-4 py-3 font-semibold hover:bg-amber-300 transition-colors mt-2"
          >
            Create listing
          </button>
        </form>
      </main>
    </div>
  )
}