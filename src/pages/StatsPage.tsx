import { Link } from 'react-router-dom'
import { Favicon } from '../components/PlaceLink'
import { CATEGORIES } from '../lib/reviews'
import type { PlaceStat } from '../lib/stats'
import { useHistory } from '../lib/useHistory'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function PlaceRow({ place, value }: { place: PlaceStat; value: string }) {
  return (
    <li>
      <span className="place-name">
        {place.url && <Favicon url={place.url} />}
        {place.name}
      </span>
      <strong>{value}</strong>
    </li>
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

      {stats.categoryAverages && (
        <section className="card">
          <h3>Average review scores</h3>
          <ul className="avg-list">
            {CATEGORIES.map((c) => (
              <li key={c.key}>
                <span>{c.label}</span>
                <strong>{stats.categoryAverages![c.key].toFixed(1)} ★</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>History</h3>
        {stats.recent.length === 0 && <p className="muted">No finished lunches yet.</p>}
        <ul className="avg-list">
          {stats.recent.slice(0, 30).map((s) => (
            <li key={s.code}>
              <span>
                <strong>{s.winner ?? 'No winner'}</strong>
                <span className="muted small">
                  {' '}
                  · {s.name} · {s.participants} {s.participants === 1 ? 'person' : 'people'}
                </span>
              </span>
              <span className="muted small">{fmtDate(s.date)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
