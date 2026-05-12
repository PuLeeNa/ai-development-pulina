// app/components/CountdownTimer.tsx
"use client"
import { useState, useEffect } from "react"

interface Props {
  closingTime: string
}

function getTimeRemaining(closingTime: string) {
  const diff = new Date(closingTime).getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

export default function CountdownTimer({ closingTime }: Props) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(closingTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(closingTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [closingTime])

  if (!remaining) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-400 text-black">
        Closed
      </span>
    )
  }

  const parts = []
  if (remaining.days > 0) parts.push(`${remaining.days}d`)
  parts.push(`${remaining.hours}h`)
  parts.push(`${remaining.minutes}m`)
  parts.push(`${remaining.seconds}s`)

  return (
    <span className="text-zinc-400 text-sm">
      Closes in {parts.join(" ")}
    </span>
  )
}