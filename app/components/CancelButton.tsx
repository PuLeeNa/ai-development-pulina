// app/components/CancelButton.tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  listingId: string
}

export default function CancelButton({ listingId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setError(null)
    const res = await fetch(`/api/listings/${listingId}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Failed to cancel listing")
      return
    }
    router.push("/listings")
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCancel}
        className="px-4 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
      >
        Cancel listing
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}