import { api } from '../lib/supabase'
import { formatRemaining, phaseEnds } from '../lib/phase'
import { getProgress } from '../lib/progress'
import { useSession } from '../lib/session-context'
import { useAction } from '../lib/useAction'

const SUGGEST_EXTENSIONS = [
  { label: '+1 h', seconds: 3600 },
  { label: '+2 h', seconds: 7200 },
  { label: '+3 h', seconds: 10800 },
]
const RANK_EXTENSIONS = [
  { label: '+2 min', seconds: 120 },
  { label: '+5 min', seconds: 300 },
  { label: '+10 min', seconds: 600 },
]

export function Countdown() {
  const {
    session,
    phase,
    now,
    isCreator,
    clientId,
    refresh,
    participants,
    options,
    vetoes,
    ballots,
  } = useSession()
  const { run, busy, error } = useAction()
  const { suggestEnd, rankEnd } = phaseEnds(session)

  if (phase === 'results') {
    return (
      <div className="card countdown done">
        <span className="eyebrow">Session complete</span>
        <strong className="countdown-time">🏆 Results are in</strong>
      </div>
    )
  }

  const progress = getProgress(phase, { participants, options, vetoes, ballots })
  const creator = participants.find((p) => p.client_id === session.creator_id)
  const remaining = (phase === 'suggest' ? suggestEnd : rankEnd) - now
  const extensions = phase === 'suggest' ? SUGGEST_EXTENSIONS : RANK_EXTENSIONS
  const act = (fn: () => Promise<unknown>) =>
    run(async () => {
      await fn()
      await refresh()
    })

  return (
    <div className="card countdown">
      <div>
        <span className="eyebrow">
          {phase === 'suggest' ? 'Suggest & veto ends in' : 'Ranking locks in'}
        </span>
        <strong
          className={`countdown-time ${remaining < 60_000 ? 'urgent' : ''}`}
          role="timer"
          aria-live="off"
        >
          {formatRemaining(remaining)}
        </strong>
        <span className="muted small progress-note">
          {progress.everyoneDone
            ? isCreator
              ? "🎉 Everyone's done. You can finish now, or let the timer run."
              : `🎉 Everyone's done. Waiting for ${creator?.name ?? 'the creator'} to move on.`
            : `${progress.done} of ${progress.total} finished`}
        </span>
      </div>
      {isCreator && (
        <div className="creator-controls" aria-label="Creator timer controls">
          {extensions.map((ext) => (
            <button
              key={ext.label}
              type="button"
              className="btn btn-soft"
              disabled={busy}
              onClick={() => act(() => api.extend(session.code, clientId, ext.seconds))}
            >
              {ext.label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => act(() => api.resetTimer(session.code, clientId))}
          >
            ↺ Reset timer
          </button>
          <button
            type="button"
            className={progress.everyoneDone ? 'btn btn-primary nudge' : 'btn btn-ghost'}
            disabled={busy}
            onClick={() => act(() => api.endEarly(session.code, clientId))}
          >
            ✓ Complete now
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
