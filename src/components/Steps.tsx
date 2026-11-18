import { NavLink } from 'react-router-dom'
import type { Phase } from '../lib/phase'
import { useSession } from '../lib/session-context'

const PHASE_ORDER: Record<Phase, number> = { suggest: 0, veto: 1, rank: 2, results: 3 }

const STEPS: { title: string; detail: string; path: string; phase: Phase }[] = [
  { title: 'Suggest', detail: 'up to 3 places', path: '/options', phase: 'suggest' },
  { title: 'Veto', detail: 'knock out the no-gos', path: '/veto', phase: 'veto' },
  { title: 'Rank', detail: 'order your favorites', path: '/rank', phase: 'rank' },
  { title: 'Results', detail: 'see the winner', path: '/results', phase: 'results' },
  { title: 'Reviews', detail: 'rate the place', path: '/reviews', phase: 'results' },
]

export function ProgressSteps({ phase, code }: { phase?: Phase; code?: string }) {
  const search = code ? `?code=${code}` : ''
  return (
    <nav className="progress-steps" aria-label="Session steps">
      <ol>
        {STEPS.map((step, i) => {
          const rel = phase ? PHASE_ORDER[step.phase] - PHASE_ORDER[phase] : null
          const state = rel === null ? '' : rel < 0 ? 'done' : rel === 0 ? 'live' : 'upcoming'
          const body = (
            <>
              <span className="step-num" aria-hidden="true">
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className="step-text">
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </span>
            </>
          )
          return (
            <li key={step.path}>
              {!code || state === 'upcoming' ? (
                <span className={`step ${state}`} aria-disabled={!!code}>
                  {body}
                </span>
              ) : (
                <NavLink
                  to={{ pathname: step.path, search }}
                  className={({ isActive }) => `step ${state}${isActive ? ' current' : ''}`}
                >
                  {body}
                </NavLink>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Steps() {
  const { phase, session } = useSession()
  return <ProgressSteps phase={phase} code={session.code} />
}
