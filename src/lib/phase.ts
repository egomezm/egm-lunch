import type { Session } from './types'

export type Phase = 'suggest' | 'veto' | 'rank' | 'results'

type Timing = Pick<Session, 'suggest_ends_at' | 'veto_seconds' | 'rank_seconds'>

export function phaseEnds(session: Timing) {
  const suggestEnd = Date.parse(session.suggest_ends_at)
  const vetoEnd = suggestEnd + session.veto_seconds * 1000
  return { suggestEnd, vetoEnd, rankEnd: vetoEnd + session.rank_seconds * 1000 }
}

export function getPhase(session: Timing, now: number): Phase {
  const { suggestEnd, vetoEnd, rankEnd } = phaseEnds(session)
  if (now < suggestEnd) return 'suggest'
  if (now < vetoEnd) return 'veto'
  if (now < rankEnd) return 'rank'
  return 'results'
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
