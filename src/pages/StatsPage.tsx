import { Link } from 'react-router-dom'
import { Favicon } from '../components/PlaceLink'
import { useState } from 'react'
import type { PlaceStat, SessionDetail } from '../lib/stats'
import { useHistory } from '../lib/useHistory'

function PlaceRow({ place, value }: { place: PlaceStat; value: string }) {
  return (
    <li>
      <span className="place-name">
        {place.url && <Favicon url={place.url} />}
        {place.name}
        {place.suggestedBy && <span className="by">by {place.suggestedBy}</span>}
      </span>
      <strong>{value}</strong>
    </li>
  )
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const PHASE_LABEL: Record<string, string> = {
  suggest: 'Suggesting',
  veto: 'Vetoing',
  rank: 'Ranking',
  results: 'Finished',
}

function SessionHistory({ sessions }: { sessions: SessionDetail[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const current = sessions.find((s) => s.code === selected) ?? sessions[0]

  return (
    <section className="card">
      <h3>Session History</h3>
      {sessions.length === 0 && <p className="muted">No sessions yet.</p>}
      {current && (
        <div className="history">
          <ul className="history-list">
            {sessions.map((s) => (
              <li key={s.code}>
                <button
                  type="button"
                  className={s.code === current.code ? 'history-item active' : 'history-item'}
                  onClick={() => setSelected(s.code)}
                >
                  <strong>{s.name}</strong>
                  <span className="muted small">{fmtDateTime(s.createdAt)}</span>
                  <span className="muted small">
                    {s.participants.length} {s.participants.length === 1 ? 'user' : 'users'} ·
                    Summary →
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <SessionSummaryView session={current} />
        </div>
      )}
    </section>
  )
}

function SessionSummaryView({ session: s }: { session: SessionDetail }) {
  return (
    <div className="history-detail">
      <h4>{s.name}</h4>
      <p className="muted small">
        {fmtDateTime(s.createdAt)} · {PHASE_LABEL[s.phase]}
        {s.creator && ` · created by ${s.creator}`}
      </p>
      {s.winner && (
        <p className="history-winner">
          🏆 <strong>{s.winner}</strong>
          {s.rating !== null && <span className="muted small"> · {s.rating.toFixed(1)} ★</span>}
        </p>
      )}
      <h5>Users ({s.participants.length})</h5>
      <p className="muted small">{s.participants.join(', ') || 'None'}</p>
      <h5>Places</h5>
      {s.options.length === 0 && <p className="muted small">Nothing was suggested.</p>}
      <ul className="avg-list">
        {s.options.map((o, i) => (
          <li key={i}>
            <span className="place-name">
              {o.url && <Favicon url={o.url} />}
              {o.rank ? `${o.rank}. ` : ''}
              {o.name}
              {o.suggestedBy && <span className="by">by {o.suggestedBy}</span>}
              {o.vetoedBy.length > 0 && <span className="by">· 🚫 {o.vetoedBy.join(', ')}</span>}
            </span>
            {o.points !== null && <strong>{o.points} pts</strong>}
          </li>
        ))}
      </ul>
      {s.comments.length > 0 && (
        <>
          <h5>Comments</h5>
          <ul className="history-comments">
            {s.comments.map((c, i) => (
              <li key={i}>
                “{c.text}” <span className="by">— {c.by}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function StatsPage() {
  const state = useHistory()

  if (state.status === 'loading')
    return <div className="center muted spinner">Loading history…</div>
  if (state.status === 'error') {
    return (
      <div className="card narrow center rise">
        <h2>Couldn't load history</h2>
        <p className="muted">Check your connection and try again.</p>
        <Link className="btn btn-primary" to="/">
          Home
        </Link>
      </div>
    )
  }

  const { stats } = state
  const winners = stats.places
    .filter((p) => p.wins > 0)
    .sort((a, b) => b.wins - a.wins || b.suggested - a.suggested)
    .slice(0, 5)
  const users = [...stats.users].sort(
    (a, b) => b.sessions - a.sessions || b.suggested - a.suggested,
  )
  const topUsers = stats.users
    .filter((u) => u.wins > 0)
    .sort((a, b) => b.wins - a.wins || b.suggested - a.suggested)
    .slice(0, 5)
  const suggested = [...stats.places].sort((a, b) => b.suggested - a.suggested).slice(0, 5)
  const vetoed = stats.places
    .filter((p) => p.vetoed > 0)
    .sort((a, b) => b.vetoed - a.vetoed)
    .slice(0, 5)
  const rated = stats.places
    .filter((p) => p.rating !== null)
    .sort((a, b) => b.rating! - a.rating!)
    .slice(0, 5)

  return (
    <div className="stats rise">
      <h1 className="stats-title">Statistics &amp; history</h1>

      <div className="stat-tiles">
        <div className="card stat-tile">
          <strong>{stats.finishedSessions}</strong>
          <span className="muted small">Lunches decided</span>
        </div>
        <div className="card stat-tile">
          <strong>{stats.participants}</strong>
          <span className="muted small">People</span>
        </div>
        <div className="card stat-tile">
          <strong>{stats.places.length}</strong>
          <span className="muted small">Different places</span>
        </div>
        <div className="card stat-tile">
          <strong>{stats.reviewCount}</strong>
          <span className="muted small">Reviews</span>
        </div>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>🏆 Most wins</h3>
          {winners.length === 0 && <p className="muted">No winners yet.</p>}
          <ul className="avg-list">
            {winners.map((p) => (
              <PlaceRow key={p.key} place={p} value={`${p.wins}×`} />
            ))}
          </ul>
        </section>
        <section className="card">
          <h3>⭐ Best rated</h3>
          {rated.length === 0 && <p className="muted">No reviews yet.</p>}
          <ul className="avg-list">
            {rated.map((p) => (
              <PlaceRow key={p.key} place={p} value={`${p.rating!.toFixed(1)} ★`} />
            ))}
          </ul>
        </section>
        <section className="card">
          <h3>💡 Most suggested</h3>
          <ul className="avg-list">
            {suggested.map((p) => (
              <PlaceRow key={p.key} place={p} value={`${p.suggested}×`} />
            ))}
          </ul>
        </section>
        <section className="card">
          <h3>🚫 Most vetoed</h3>
          {vetoed.length === 0 && <p className="muted">No vetoes yet.</p>}
          <ul className="avg-list">
            {vetoed.map((p) => (
              <PlaceRow key={p.key} place={p} value={`${p.vetoed}×`} />
            ))}
          </ul>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>🥇 Users with most wins</h3>
          {topUsers.length === 0 && <p className="muted">No winning suggestions yet.</p>}
          <ul className="avg-list">
            {topUsers.map((u) => (
              <li key={u.key}>
                <span>{u.name}</span>
                <strong>{u.wins}×</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h3>👥 Users</h3>
          <ul className="avg-list">
            {users.map((u) => (
              <li key={u.key}>
                <span>{u.name}</span>
                <span className="muted small">
                  {u.sessions} {u.sessions === 1 ? 'lunch' : 'lunches'} · {u.suggested} suggested ·{' '}
                  {u.wins} {u.wins === 1 ? 'win' : 'wins'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <SessionHistory sessions={stats.sessions} />
    </div>
  )
}
