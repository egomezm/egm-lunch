import { createContext, useContext } from 'react'
import type { Phase } from './phase'
import type { Participant, SessionData } from './types'

export interface SessionContextValue extends SessionData {
  me: Participant
  clientId: string
  phase: Phase
  now: number
  isCreator: boolean
  refresh: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside a session')
  return value
}
