import type { Phase } from './phase'
import type { SessionData } from './types'

export const MAX_OPTIONS = 3

export interface Progress {
  done: number
  total: number
  everyoneDone: boolean
}

type Data = Pick<SessionData, 'participants' | 'options' | 'vetoes' | 'ballots'>

// Suggest: 3 places added. Veto: every veto they can use is used. Ranking is done once their ballot is locked. Nothing here ends a phase by itself.
export function getProgress(phase: Phase, data: Data): Progress {
  const { participants, options, vetoes, ballots } = data
  const total = participants.length
  if (phase === 'results' || total === 0) return { done: 0, total, everyoneDone: false }

  const vetoLimit = Math.min(total - 1, options.length)
  const done = participants.filter((p) => {
    if (phase === 'rank') return ballots.some((b) => b.participant_id === p.id && b.locked)
    if (phase === 'suggest') {
      return options.filter((o) => o.participant_id === p.id).length >= MAX_OPTIONS
    }
    return vetoes.filter((v) => v.participant_id === p.id).length >= vetoLimit
  }).length

  return { done, total, everyoneDone: done === total }
}
