import { useState, type FormEvent } from 'react'
import { getSavedName, saveName } from '../lib/storage'
import { api } from '../lib/supabase'
import { useAction } from '../lib/useAction'

interface Props {
  code: string
  sessionName: string
  clientId: string
  canJoin: boolean
  onJoined: () => Promise<void>
}

export function NameGate({ code, sessionName, clientId, canJoin, onJoined }: Props) {
  const [name, setName] = useState(() => getSavedName(code))
  const { run, busy, error } = useAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const ok = await run(() => api.join(code, clientId, trimmed))
    if (ok) {
      saveName(code, trimmed)
      await onJoined()
    }
  }

  if (!canJoin) {
    return (
      <div className="card narrow center rise">
        <h2>{sessionName}</h2>
        <p className="muted">This session has moved on and is no longer accepting new people.</p>
        <a className="btn btn-primary" href="#/">
          Start your own session
        </a>
      </div>
    )
  }

  return (
    <form className="card narrow rise" onSubmit={submit}>
      <span className="eyebrow">You're invited to</span>
      <h2>{sessionName}</h2>
      <label htmlFor="who">What should we call you?</label>
      <input
        id="who"
        value={name}
        maxLength={40}
        autoFocus
        autoComplete="nickname"
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <button className="btn btn-primary" disabled={busy || !name.trim()}>
        Join session
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
