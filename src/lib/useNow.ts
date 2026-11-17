import { useEffect, useState } from 'react'
import { api } from './supabase'

// Clock aligned to the server so every browser agrees on when timers end.
export function useNow(): number {
  const [offset, setOffset] = useState(0)
  const [tick, setTick] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    const sent = Date.now()
    api
      .serverNow()
      .then((iso) => {
        const received = Date.now()
        if (!cancelled) setOffset(Date.parse(iso) - (sent + received) / 2)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  return tick + offset
}
