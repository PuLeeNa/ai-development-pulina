// app/listings/loading.tsx
export default function ListingsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Loading auctions…</p>
      </div>
    </div>
  )
}