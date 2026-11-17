import { useCallback, useState } from 'react'

export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { run, busy, error }
}
