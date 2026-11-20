import { Link } from 'react-router-dom'
import { Favicon } from '../components/PlaceLink'
import { useState, type ReactNode } from 'react'
import type { PlaceStat, SessionDetail, Stats } from '../lib/stats'
import { useHistory } from '../lib/useHistory'

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
                  <span className="history-winner-line small">
                    🏆 {s.winner ?? (s.phase === 'results' ? 'No winner' : 'In progress')}
                  </span>
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

type StatKey = 'Winners' | 'Users' | 'Most Vetoed' | 'Most Suggested' | 'Best Rated'
const STAT_ROWS: StatKey[] = ['Winners', 'Users', 'Most Vetoed', 'Most Suggested', 'Best Rated']
  .slice()
  .sort((a, b) => a.localeCompare(b)) as StatKey[]

function SessionStats({ stats }: { stats: Stats }) {
  const [selected, setSelected] = useState<StatKey>(STAT_ROWS[0])
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

  const rows: { key: string; node: ReactNode; value: string }[] = (() => {
    const place = (p: PlaceStat, value: string) => ({
      key: p.key,
      value,
      node: (
        <span className="place-name">
          {p.url && <Favicon url={p.url} />}
          {p.name}
          {p.suggestedBy && <span className="by">by {p.suggestedBy}</span>}
        </span>
      ),
    })
    switch (selected) {
      case 'Winners':
        return stats.places
          .filter((p) => p.wins > 0)
          .sort((a, b) => b.wins - a.wins || byName(a, b))
          .map((p) => place(p, `${p.wins}×`))
      case 'Best Rated':
        return stats.places
          .filter((p) => p.rating !== null)
          .sort((a, b) => b.rating! - a.rating! || byName(a, b))
          .map((p) => place(p, `${p.rating!.toFixed(1)} ★`))
      case 'Most Suggested':
        return [...stats.places]
          .sort((a, b) => b.suggested - a.suggested || byName(a, b))
          .map((p) => place(p, `${p.suggested}×`))
      case 'Most Vetoed':
        return stats.places
          .filter((p) => p.vetoed > 0)
          .sort((a, b) => b.vetoed - a.vetoed || byName(a, b))
          .map((p) => place(p, `${p.vetoed}×`))
      case 'Users':
        return [...stats.users]
          .sort((a, b) => b.wins - a.wins || b.suggested - a.suggested || byName(a, b))
          .map((u) => ({
            key: u.key,
            node: <span>{u.name}</span>,
            value: `${u.sessions} ${u.sessions === 1 ? 'lunch' : 'lunches'} · ${u.suggested} suggested · ${u.wins} ${u.wins === 1 ? 'win' : 'wins'}`,
          }))
    }
  })()

  return (
    <section className="card">
      <h3>Session Stats</h3>
      <div className="history">
        <ul className="history-list">
          {STAT_ROWS.map((r) => (
            <li key={r}>
              <button
                type="button"
                className={r === selected ? 'history-item active' : 'history-item'}
                onClick={() => setSelected(r)}
              >
                <strong>{r}</strong>
                <span className="muted small">See details →</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="history-detail">
          <h4>{selected}</h4>
          {rows.length === 0 && <p className="muted small">Nothing to show yet.</p>}
          <ul className="avg-list stat-rows">
            {rows.map((r) => (
              <li key={r.key}>
                {r.node}
                <strong className={selected === 'Users' ? 'small muted' : undefined}>
                  {r.value}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
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

  return (
    <div className="stats rise">
      <h1 className="stats-title">Statistics &amp; history</h1>
      <SessionHistory sessions={state.stats.sessions} />
      <SessionStats stats={state.stats} />
    </div>
  )
}
