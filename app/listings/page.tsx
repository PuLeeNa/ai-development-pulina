// app/listings/page.tsx
import Link from "next/link"
import Navbar from "@/app/components/Navbar"
import CountdownTimer from "@/app/components/CountdownTimer"

interface Listing {
  id: string
  title: string
  photoUrl: string
  startingPrice: number
  closingTime: string
  sellerId: string
  createdAt: string
}

async function getListings(): Promise<Listing[]> {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/listings`, {
    cache: "no-store",
  })
  if (!res.ok) return []
  return res.json()
}

export default async function ListingsPage() {
  const listings = await getListings()

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Auctions</h1>
          <Link
            href="/listings/new"
            className="bg-amber-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-amber-300 transition-colors text-sm"
          >
            + Create Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-zinc-400 text-lg">No listings yet.</p>
            <p className="text-zinc-600 text-sm mt-2">Be the first to list a pair.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-400/40 transition-colors"
              >
                <div className="aspect-square bg-zinc-800 overflow-hidden">
                  <img
                    src={listing.photoUrl}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <h2 className="text-white font-semibold truncate">{listing.title}</h2>
                  <p className="text-amber-400 font-bold">${listing.startingPrice.toLocaleString()}</p>
                  <CountdownTimer closingTime={listing.closingTime} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}