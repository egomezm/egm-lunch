import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { getClientId } from '../lib/storage'
import { api, isConfigured } from '../lib/supabase'
import { useAction } from '../lib/useAction'

const SUGGEST_CHOICES = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
]
const RANK_CHOICES = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
]

export function Landing() {
  const navigate = useNavigate()
  const { run, busy, error } = useAction()
  const [name, setName] = useState('')
  const [suggestMinutes, setSuggestMinutes] = useState(30)
  const [rankSeconds, setRankSeconds] = useState(60)
  const [joinCode, setJoinCode] = useState('')

  async function create(event: FormEvent) {
    event.preventDefault()
    let code = ''
    const ok = await run(async () => {
      code = await api.createSession(name.trim(), getClientId(), suggestMinutes, rankSeconds)
    })
    if (ok) navigate({ pathname: '/options', search: `?code=${code}` })
  }

  function join(event: FormEvent) {
    event.preventDefault()
    const code = joinCode.trim().toLowerCase()
    if (code) navigate({ pathname: '/options', search: `?code=${code}` })
  }

  return (
    <div className="landing">
      <div className="theme-fab">
        <ThemeToggle />
      </div>
      <section className="hero rise">
        <span className="eyebrow">Team lunch, settled fairly</span>
        <h1>
          Where are we <span className="gradient-text">eating</span> today?
        </h1>
        <p className="lede">
          Everyone suggests places, vetoes the ones they can't stand, then ranks what's left. One
          clear winner, no endless chat thread.
        </p>
        <ol className="steps">
          <li>
            <b>Suggest</b> up to 3 places
          </li>
          <li>
            <b>Veto</b> the no-gos
          </li>
          <li>
            <b>Rank</b> your favorites
          </li>
          <li>
            <b>Eat</b> the winner 🍽️
          </li>
        </ol>
      </section>

      <div className="landing-forms">
        <form className="card rise" onSubmit={create}>
          <h2>Start a session</h2>
          {!isConfigured && (
            <p className="error" role="alert">
              The backend isn't configured yet (missing Supabase settings).
            </p>
          )}
          <label htmlFor="session-name">Session name</label>
          <input
            id="session-name"
            value={name}
            maxLength={80}
            placeholder="Friday team lunch"
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset>
            <legend>Suggest &amp; veto timer</legend>
            <div className="choices">
              {SUGGEST_CHOICES.map((c) => (
                <label key={c.value} className={suggestMinutes === c.value ? 'chip on' : 'chip'}>
                  <input
                    type="radio"
                    name="suggest"
                    checked={suggestMinutes === c.value}
                    onChange={() => setSuggestMinutes(c.value)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Ranking timer</legend>
            <div className="choices">
              {RANK_CHOICES.map((c) => (
                <label key={c.value} className={rankSeconds === c.value ? 'chip on' : 'chip'}>
                  <input
                    type="radio"
                    name="rank"
                    checked={rankSeconds === c.value}
                    onChange={() => setRankSeconds(c.value)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn btn-primary" disabled={busy || !name.trim() || !isConfigured}>
            {busy ? 'Creating…' : 'Create session'}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>

        <form className="card rise" onSubmit={join}>
          <h2>Have a code?</h2>
          <label htmlFor="join-code">Session code</label>
          <input
            id="join-code"
            value={joinCode}
            maxLength={12}
            placeholder="k7x2p9"
            autoCapitalize="none"
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button className="btn btn-soft" disabled={!joinCode.trim()}>
            Join session
          </button>
        </form>
      </div>
    </div>
  )
}
