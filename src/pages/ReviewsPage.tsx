import { useState } from 'react'
import { Link } from 'react-router-dom'
import { averages, CATEGORIES, COMMENT_MAX, type RatingKey } from '../lib/reviews'
import { scoreOptions, survivingOptions } from '../lib/scoring'
import { useSession } from '../lib/session-context'
import { api } from '../lib/supabase'
import { useAction } from '../lib/useAction'

type Ratings = Record<RatingKey, number>

function Stars({
  name,
  label,
  hint,
  value,
  onChange,
}: {
  name: string
  label: string
  hint: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <fieldset className="stars-row">
      <legend>
        <strong>{label}</strong>
        <span className="muted small">{hint}</span>
      </legend>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= value ? 'star on' : 'star'}>
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            <span aria-hidden="true">★</span>
            <span className="sr-only">
              {n} star{n > 1 ? 's' : ''}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function ReviewsPage() {
  const { phase, options, vetoes, ballots, participants, reviews, me, clientId, session, refresh } =
    useSession()
  const { run, busy, error } = useAction()
  const mine = reviews.find((r) => r.participant_id === me.id)
  const [draft, setDraft] = useState<Partial<Ratings>>({})
  const [commentDraft, setCommentDraft] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (phase !== 'results') {
    return (
      <div className="card narrow center rise">
        <h2>Reviews open after the results</h2>
        <p className="muted">Once lunch is decided you can rate the place here.</p>
      </div>
    )
  }

  const winner = scoreOptions(
    survivingOptions(options, vetoes),
    ballots,
    participants.map((p) => p.id),
  )[0]
  if (!winner) {
    return (
      <div className="card narrow center rise">
        <h2>Nothing to review</h2>
        <p className="muted">Nobody suggested a place this time.</p>
        <Link className="btn btn-primary" to="/">
          New session
        </Link>
      </div>
    )
  }

  const value = (key: RatingKey) => draft[key] ?? mine?.[key] ?? 0
  const comment = commentDraft ?? mine?.comment ?? ''
  const complete = CATEGORIES.every((c) => value(c.key) > 0)
  const avg = averages(reviews)
  const whoIs = (id: string) => participants.find((p) => p.id === id)?.name ?? 'Someone'

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const ratings = Object.fromEntries(CATEGORIES.map((c) => [c.key, value(c.key)])) as Ratings
    const ok = await run(async () => {
      await api.submitReview(session.code, clientId, winner.option.id, ratings, comment.trim())
      await refresh()
    })
    setSaved(ok)
  }

  return (
    <div className="rise">
      <form className="card" onSubmit={submit}>
        <span className="eyebrow">Review</span>
        <h2>How was {winner.option.name}?</h2>
        <p className="muted">
          Rate each category from 1 to 5 stars.
          {mine ? ' You already reviewed this. Change anything and save again.' : ''}
        </p>
        {CATEGORIES.map((c) => (
          <Stars
            key={c.key}
            name={c.key}
            label={c.label}
            hint={c.hint}
            value={value(c.key)}
            onChange={(n) => {
              setSaved(false)
              setDraft((d) => ({ ...d, [c.key]: n }))
            }}
          />
        ))}
        <label htmlFor="review-comment">Comments (optional)</label>
        <textarea
          id="review-comment"
          rows={2}
          maxLength={COMMENT_MAX}
          value={comment}
          placeholder="One line for the team…"
          onChange={(e) => {
            setSaved(false)
            setCommentDraft(e.target.value)
          }}
        />
        <p className="muted small char-count">
          {comment.length}/{COMMENT_MAX}
        </p>
        <button className="btn btn-primary" disabled={busy || !complete}>
          {mine ? 'Update review' : 'Submit review'}
        </button>
        {!complete && <p className="muted small">Rate all five categories to submit.</p>}
        {saved && (
          <p className="locked" role="status">
            ✓ Thanks, your review is saved.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>

      <section className="card">
        <h3>Team feedback</h3>
        <p className="muted small">
          {reviews.length} of {participants.length} reviewed
        </p>
        {avg ? (
          <>
            <ul className="avg-list">
              {CATEGORIES.map((c) => (
                <li key={c.key}>
                  <span>{c.label}</span>
                  <strong>{avg[c.key].toFixed(1)} ★</strong>
                </li>
              ))}
            </ul>
            <ul className="comments">
              {reviews
                .filter((r) => r.comment)
                .map((r) => (
                  <li key={r.participant_id}>
                    “{r.comment}” <span className="muted small">· {whoIs(r.participant_id)}</span>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <p className="muted">No reviews yet. Be the first.</p>
        )}
      </section>
    </div>
  )
}
