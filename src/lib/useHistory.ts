import { useEffect, useState } from 'react'
import { buildStats, type RawHistory, type Stats } from './stats'
import { supabase } from './supabase'
import type { Ballot, Option, Participant, Review, Session, Veto } from './types'

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: Stats }

async function fetchHistory(): Promise<RawHistory> {
  if (!supabase) throw new Error('Supabase is not configured')
  const [sessions, participants, options, vetoes, ballots, reviews] = await Promise.all([
    supabase.from('sessions').select('*').limit(1000),
    supabase.from('participants').select('*').limit(5000),
    supabase.from('options').select('*').limit(5000),
    supabase.from('vetoes').select('*').limit(5000),
    supabase.from('ballots').select('*').limit(5000),
    supabase.from('reviews').select('*').limit(5000),
  ])
  const failure = [sessions, participants, options, vetoes, ballots].find((r) => r.error)
  if (failure?.error) throw new Error(failure.error.message)
  return {
    sessions: (sessions.data ?? []) as Session[],
    participants: (participants.data ?? []) as Participant[],
    options: (options.data ?? []) as Option[],
    vetoes: (vetoes.data ?? []) as Veto[],
    ballots: (ballots.data ?? []) as Ballot[],
    reviews: reviews.error ? [] : ((reviews.data ?? []) as Review[]),
  }
}

export function useHistory(): State {
  const [state, setState] = useState<State>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    fetchHistory()
      .then((raw) => !cancelled && setState({ status: 'ready', stats: buildStats(raw) }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [])
  return state
}
