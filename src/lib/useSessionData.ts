import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Ballot, Option, Participant, Session, SessionData, Veto } from './types'

type State =
  | { status: 'loading' }
  | { status: 'notfound' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SessionData }

async function fetchAll(code: string): Promise<SessionData | null> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', code)
    .maybeSingle<Session>()
  if (error) throw new Error(error.message)
  if (!session) return null

  const [participants, options, vetoes, ballots] = await Promise.all([
    supabase.from('participants').select('*').eq('session_id', session.id),
    supabase.from('options').select('*').eq('session_id', session.id).order('created_at'),
    supabase.from('vetoes').select('*').eq('session_id', session.id),
    supabase.from('ballots').select('*').eq('session_id', session.id),
  ])
  const failure = [participants, options, vetoes, ballots].find((r) => r.error)
  if (failure?.error) throw new Error(failure.error.message)

  return {
    session,
    participants: (participants.data ?? []) as Participant[],
    options: (options.data ?? []) as Option[],
    vetoes: (vetoes.data ?? []) as Veto[],
    ballots: (ballots.data ?? []) as Ballot[],
  }
}

export function useSessionData(code: string) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const timer = useRef<number>(undefined)
  const sessionId = state.status === 'ready' ? state.data.session.id : null

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAll(code)
      setState(data ? { status: 'ready', data } : { status: 'notfound' })
    } catch (e) {
      setState((prev) =>
        prev.status === 'ready'
          ? prev
          : { status: 'error', message: e instanceof Error ? e.message : 'Failed to load' },
      )
    }
  }, [code])

  useEffect(() => {
    setState({ status: 'loading' })
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !sessionId) return
    const schedule = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void refresh(), 150)
    }
    let channel = supabase.channel(`session-${sessionId}`)
    for (const table of ['participants', 'options', 'vetoes', 'ballots']) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `session_id=eq.${sessionId}` },
        schedule,
      )
    }
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
      schedule,
    )
    channel.subscribe()
    // Polling is a safety net if the realtime socket drops.
    const poll = window.setInterval(() => void refresh(), 15000)
    return () => {
      window.clearInterval(poll)
      window.clearTimeout(timer.current)
      void supabase?.removeChannel(channel)
    }
  }, [sessionId, refresh])

  return { state, refresh }
}
