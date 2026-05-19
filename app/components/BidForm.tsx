"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface BidFormProps {
  listingId: string
  startingPrice: number
  existingBid?: number
}

export default function BidForm({ listingId, startingPrice, existingBid }: BidFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState(existingBid?.toString() ?? "")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/listings/${listingId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Something went wrong")
        return
      }
      setSuccess(existingBid ? "Bid updated!" : "Bid placed!")
      setTimeout(() => setSuccess(null), 2000)
      router.refresh()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="bid-amount" className="block text-sm font-medium text-zinc-400 mb-2">
          Your bid
        </label>
        <div className="flex gap-2">
          <input
            id="bid-amount"
            type="number"
            min={startingPrice}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`$${startingPrice.toLocaleString()} min`}
            required
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            {loading ? "Placing…" : existingBid ? "Update bid" : "Place bid"}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-red-400 bg-red-400/10 rounded-lg px-4 py-3 text-sm">{error}</p>
      )}
      {success && (
        <p role="status" className="text-green-400 bg-green-400/10 rounded-lg px-4 py-3 text-sm">{success}</p>
      )}
    </form>
  )
}
