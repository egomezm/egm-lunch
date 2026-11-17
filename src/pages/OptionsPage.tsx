import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getHistory, rememberPlace } from '../lib/storage'
import { useSession } from '../lib/session-context'
import { api } from '../lib/supabase'
import { useAction } from '../lib/useAction'

const MAX_OPTIONS = 3

export function OptionsPage() {
  const { session, options, participants, me, clientId, phase, refresh } = useSession()
  const { run, busy, error } = useAction()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  const open = phase === 'suggest'
  const mine = options.filter((o) => o.participant_id === me.id)
  const taken = new Set(options.map((o) => o.name.trim().toLowerCase()))
  const past = getHistory().filter((p) => !taken.has(p.name.trim().toLowerCase()))
  const whoIs = (id: string) => participants.find((p) => p.id === id)?.name ?? 'Someone'

  async function add(event: FormEvent) {
    event.preventDefault()
    const place = { name: name.trim(), url: url.trim() }
    if (!place.name) return
    const ok = await run(async () => {
      await api.addOption(session.code, clientId, place.name, place.url)
      await refresh()
    })
    if (ok) {
      rememberPlace(place)
      setName('')
      setUrl('')
    }
  }

  return (
    <div className="grid-2">
      <section className="card rise">
        <h2>
          Your suggestions{' '}
          <span className="pill">
            {mine.length}/{MAX_OPTIONS}
          </span>
        </h2>
        {open && mine.length < MAX_OPTIONS ? (
          <form onSubmit={add}>
            <label htmlFor="place">Place to eat</label>
            <input
              id="place"
              value={name}
              maxLength={80}
              placeholder="e.g. Tacos El Gordo"
              onChange={(e) => setName(e.target.value)}
            />
            <label htmlFor="place-url">
              Website <span className="muted">(optional)</span>
            </label>
            <input
              id="place-url"
              type="url"
              value={url}
              maxLength={300}
              placeholder="https://…"
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="btn btn-primary" disabled={busy || !name.trim()}>
              Add place
            </button>
          </form>
        ) : (
          <p className="muted">
            {open
              ? "You've used all 3 suggestions. Remove one to add another."
              : 'Suggestions are closed.'}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {open && mine.length < MAX_OPTIONS && past.length > 0 && (
          <div className="history">
            <span className="eyebrow">From your past lunches</span>
            <div className="choices">
              {past.slice(0, 8).map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setName(p.name)
                    setUrl(p.url)
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card rise">
        <h2>
          All suggestions <span className="pill">{options.length}</span>
        </h2>
        {options.length === 0 && <p className="muted">Nothing yet. Be the first to suggest!</p>}
        <ul className="list">
          {options.map((o) => (
            <li key={o.id} className="row">
              <div>
                <strong>
                  {o.url ? (
                    <a href={o.url} target="_blank" rel="noreferrer noopener">
                      {o.name} ↗
                    </a>
                  ) : (
                    o.name
                  )}
                </strong>
                <span className="muted small">by {whoIs(o.participant_id)}</span>
              </div>
              {open && o.participant_id === me.id && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Remove ${o.name}`}
                  onClick={() =>
                    run(async () => {
                      await api.removeOption(o.id, clientId)
                      await refresh()
                    })
                  }
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        {open && options.length > 0 && (
          <Link
            className="btn btn-soft"
            to={{ pathname: '/veto', search: `?code=${session.code}` }}
          >
            Go veto →
          </Link>
        )}
      </section>
    </div>
  )
}
