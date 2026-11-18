import { useEffect, useRef } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Countdown } from '../components/Countdown'
import { NameGate } from '../components/NameGate'
import { ShareCard } from '../components/ShareCard'
import { Steps } from '../components/Steps'
import { ThemeToggle } from '../components/ThemeToggle'
import { getPhase, type Phase } from '../lib/phase'
import { SessionContext } from '../lib/session-context'
import { getClientId } from '../lib/storage'
import { useNow } from '../lib/useNow'
import { useSessionData } from '../lib/useSessionData'

const PHASE_ROUTE: Record<Phase, string | null> = {
  suggest: null,
  veto: '/veto',
  rank: '/rank',
  results: '/results',
}

export function SessionLayout() {
  const [params] = useSearchParams()
  const code = (params.get('code') ?? '').trim().toLowerCase()
  const { state, refresh } = useSessionData(code)
  const now = useNow()
  const navigate = useNavigate()
  const location = useLocation()
  const clientId = getClientId()
  const previousPhase = useRef<Phase | null>(null)

  const data = state.status === 'ready' ? state.data : null
  const phase = data ? getPhase(data.session, now) : null

  useEffect(() => {
    if (!phase) return
    const target = PHASE_ROUTE[phase]
    if (previousPhase.current !== phase && target && location.pathname !== target) {
      navigate({ pathname: target, search: location.search }, { replace: true })
    }
    previousPhase.current = phase
  }, [phase, location.pathname, location.search, navigate])

  if (!code) return <Navigate to="/" replace />
  if (state.status === 'loading')
    return <div className="center muted spinner">Loading session…</div>
  if (state.status === 'notfound') {
    return (
      <div className="card narrow center rise">
        <h2>Session not found</h2>
        <p className="muted">Double-check the code “{code}” or ask for a fresh link.</p>
        <Link className="btn btn-primary" to="/">
          Back home
        </Link>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="card narrow center rise">
        <h2>Couldn't load the session</h2>
        <p className="error">{state.message}</p>
      </div>
    )
  }

  const { session, participants } = state.data
  const me = participants.find((p) => p.client_id === clientId)
  if (!me || !phase) {
    return (
      <NameGate
        code={code}
        sessionName={session.name}
        clientId={clientId}
        canJoin={phase === 'suggest' || phase === 'veto'}
        onJoined={refresh}
      />
    )
  }

  const creator = participants.find((p) => p.client_id === session.creator_id)
  return (
    <SessionContext.Provider
      value={{
        ...state.data,
        me,
        clientId,
        phase,
        now,
        isCreator: session.creator_id === clientId,
        refresh,
      }}
    >
      <header className="session-head rise">
        <div>
          <span className="eyebrow">Lunch session</span>
          <h1>{session.name}</h1>
          <p className="muted">
            Hi {me.name} · {participants.length} {participants.length === 1 ? 'person' : 'people'}{' '}
            here
            {creator && <span className="created-by"> · created by {creator.name}</span>}
          </p>
        </div>
      </header>
      <section className="card invite-banner rise" aria-label="Session code and invite">
        <ShareCard code={session.code} />
      </section>
      <Countdown />
      <Steps />
      <Outlet />
      <div className="theme-fab">
        <ThemeToggle />
      </div>
    </SessionContext.Provider>
  )
}
