import { Link } from 'react-router-dom'
import { everythingVetoed, scoreOptions, survivingOptions } from '../lib/scoring'
import { useSession } from '../lib/session-context'

export function ResultsPage() {
  const { phase, options, vetoes, ballots, participants, session } = useSession()

  if (phase !== 'results') {
    return (
      <div className="card narrow center rise">
        <h2>Results aren't ready yet</h2>
        <p className="muted">They'll appear automatically when the ranking timer ends.</p>
      </div>
    )
  }

  const survivors = survivingOptions(options, vetoes)
  const rows = scoreOptions(survivors, ballots)
  const winner = rows[0]
  const out = options.filter((o) => !survivors.some((s) => s.id === o.id))
  const maxPoints = Math.max(1, ...rows.map((r) => r.points))
  const voters = ballots.filter((b) => b.ranking.some((id) => survivors.some((s) => s.id === id)))

  if (!winner) {
    return (
      <div className="card narrow center rise">
        <h2>No winner this time</h2>
        <p className="muted">Nobody suggested a place.</p>
        <Link className="btn btn-primary" to="/">
          New session
        </Link>
      </div>
    )
  }

  const { option } = winner
  return (
    <div className="rise">
      <section className="card winner">
        <span className="eyebrow">Today's lunch is…</span>
        <h2 className="winner-name">🏆 {option.name}</h2>
        {option.url && (
          <a
            className="btn btn-primary"
            href={option.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Visit website ↗
          </a>
        )}
        <p className="muted small">
          {voters.length} of {participants.length} people ranked
          {voters.length === 0 &&
            survivors.length > 1 &&
            ' · no rankings, so alphabetical order decided'}
          {everythingVetoed(options, vetoes) &&
            ' · everything was vetoed, least-vetoed places returned'}
        </p>
      </section>

      <section className="card">
        <h3>Scoreboard</h3>
        <ol className="scores">
          {rows.map((r, i) => (
            <li key={r.option.id} className={i === 0 ? 'score top' : 'score'}>
              <div className="score-head">
                <span>
                  {i + 1}. {r.option.name}
                </span>
                <strong>
                  {r.points} pts
                  <span className="muted small"> · {r.firstPlaces} first</span>
                </strong>
              </div>
              <div className="bar">
                <span style={{ width: `${(r.points / maxPoints) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
        {out.length > 0 && (
          <p className="muted small">Vetoed: {out.map((o) => o.name).join(', ')}</p>
        )}
      </section>

      <div className="center">
        <Link className="btn btn-soft" to="/" state={{ from: session.code }}>
          Start a new session
        </Link>
      </div>
    </div>
  )
}
