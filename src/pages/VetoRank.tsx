import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { PlaceLink } from '../components/PlaceLink'
import { everythingVetoed, survivingOptions } from '../lib/scoring'
import { useSession } from '../lib/session-context'
import { api } from '../lib/supabase'
import type { Option } from '../lib/types'
import { useAction } from '../lib/useAction'

function Closed({
  title,
  text,
  to,
  cta,
}: {
  title: string
  text: string
  to: string
  cta: string
}) {
  const { session } = useSession()
  return (
    <div className="card narrow center rise">
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      <Link className="btn btn-primary" to={{ pathname: to, search: `?code=${session.code}` }}>
        {cta}
      </Link>
    </div>
  )
}

export function VetoPage() {
  const { phase } = useSession()
  if (phase === 'veto') return <VetoBoard />
  if (phase === 'suggest') {
    return (
      <Closed
        title="Vetoes open after suggestions"
        text="Vetoing starts when the suggestion timer ends."
        to="/options"
        cta="Back to suggestions"
      />
    )
  }
  return (
    <Closed
      title="Vetoes are closed"
      text="The veto timer has ended."
      to={phase === 'rank' ? '/rank' : '/results'}
      cta={phase === 'rank' ? 'Go to ranking' : 'See the results'}
    />
  )
}

export function RankPage() {
  const { phase } = useSession()
  if (phase === 'rank') return <RankBoard />
  if (phase === 'suggest' || phase === 'veto') {
    return (
      <Closed
        title="Ranking opens soon"
        text="Ranking starts when the veto timer ends."
        to="/veto"
        cta="Back to vetoes"
      />
    )
  }
  return (
    <Closed
      title="Ranking is over"
      text="Everyone's rankings are in."
      to="/results"
      cta="See the results"
    />
  )
}

function VetoBoard() {
  const { options, vetoes, participants, me, clientId, session, refresh } = useSession()
  const { run, busy, error } = useAction()

  const limit = Math.max(0, participants.length - 1)
  const myVetoes = vetoes.filter((v) => v.participant_id === me.id)
  const left = Math.max(0, limit - myVetoes.length)
  const whoIs = (id: string) => participants.find((p) => p.id === id)?.name ?? 'Someone'

  return (
    <section className="rise">
      <div className="card veto-meter">
        <div>
          <h2>Veto the places you can't stand</h2>
          <p className="muted">
            You get one veto for every other person here. A vetoed place is out for everyone.
          </p>
        </div>
        <div className="meter" aria-label={`${left} of ${limit} vetoes left`}>
          <strong>{left}</strong>
          <span className="muted small">of {limit} left</span>
        </div>
      </div>
      {options.length === 0 && (
        <p className="muted center">
          No suggestions yet.{' '}
          <Link to={{ pathname: '/options', search: `?code=${session.code}` }}>Add some</Link>
        </p>
      )}
      <div className="cards">
        {options.map((o) => {
          const count = vetoes.filter((v) => v.option_id === o.id).length
          const mine = myVetoes.some((v) => v.option_id === o.id)
          return (
            <article key={o.id} className={count > 0 ? 'card option vetoed' : 'card option'}>
              <div>
                <h3>
                  <PlaceLink name={o.name} url={o.url} />
                </h3>
                <p className="muted small">Suggested by {whoIs(o.participant_id)}</p>
                {count > 0 && (
                  <span className="pill danger">
                    Out · {count} veto{count > 1 ? 'es' : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                className={mine ? 'btn btn-danger on' : 'btn btn-soft'}
                aria-pressed={mine}
                disabled={busy || (!mine && left === 0)}
                onClick={() =>
                  run(async () => {
                    await api.toggleVeto(o.id, clientId)
                    await refresh()
                  })
                }
              >
                {mine ? 'Vetoed ✕ (undo)' : 'Veto'}
              </button>
            </article>
          )
        })}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

function SortableRow({ option, index }: { option: Option; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'rank-row dragging' : 'rank-row'}
    >
      <span className="rank-num">{index + 1}</span>
      <span className="rank-name">{option.name}</span>
      <button
        type="button"
        className="handle"
        aria-label={`Reorder ${option.name}. Use space to pick up, arrows to move.`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
    </li>
  )
}

function RankBoard() {
  const { options, vetoes, ballots, me, clientId, session, refresh } = useSession()
  const { run, error } = useAction()
  const survivors = useMemo(() => survivingOptions(options, vetoes), [options, vetoes])
  const ballot = ballots.find((b) => b.participant_id === me.id)
  const locked = ballot?.locked ?? false

  const [draft, setDraft] = useState<string[] | null>(null)
  const order = useMemo(() => {
    const ids = survivors.map((o) => o.id)
    const base = (draft ?? ballot?.ranking ?? []).filter((id) => ids.includes(id))
    return [...base, ...ids.filter((id) => !base.includes(id))]
  }, [draft, ballot, survivors])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const byId = new Map(survivors.map((o) => [o.id, o]))
  const ordered = order.map((id) => byId.get(id)).filter((o): o is Option => Boolean(o))

  function save(next: string[], lock: boolean) {
    return run(async () => {
      await api.saveBallot(session.code, clientId, next, lock)
      await refresh()
    })
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)))
    setDraft(next)
    void save(next, false)
  }

  if (survivors.length === 0) {
    return (
      <div className="card narrow center rise">
        <h2>No places to rank</h2>
        <p className="muted">Nobody suggested anything this time.</p>
      </div>
    )
  }

  return (
    <section className="card rise">
      <h2>Rank what's left</h2>
      <p className="muted">
        Drag your favorite to the top. 1st place earns the most points.
        {everythingVetoed(options, vetoes) &&
          ' Everything was vetoed, so the least-vetoed places were brought back.'}
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="rank-list">
            {ordered.map((o, i) => (
              <SortableRow key={o.id} option={o} index={i} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {locked ? (
        <p className="locked" role="status">
          ✓ Your ranking is locked in. Waiting for the timer…
        </p>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => save(order, true)}>
          Lock my ranking
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
