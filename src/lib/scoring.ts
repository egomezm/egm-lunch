import type { Ballot, Option, Veto } from './types'

export interface ScoreRow {
  option: Option
  points: number
  firstPlaces: number
}

// Options with no vetoes survive. If everything was vetoed, the least-vetoed options are restored.
export function survivingOptions(options: Option[], vetoes: Veto[]): Option[] {
  const counts = new Map<string, number>()
  for (const v of vetoes) counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1)
  const alive = options.filter((o) => !counts.has(o.id))
  if (alive.length > 0 || options.length === 0) return alive
  const min = Math.min(...options.map((o) => counts.get(o.id) ?? 0))
  return options.filter((o) => (counts.get(o.id) ?? 0) === min)
}

export function everythingVetoed(options: Option[], vetoes: Veto[]): boolean {
  return options.length > 0 && options.every((o) => vetoes.some((v) => v.option_id === o.id))
}

// Borda count: with N survivors, 1st place earns N points and last earns 1.
// Ties: the option suggested first wins.
// Participants who never ranked are counted with the order they were shown (suggestion order).
export function scoreOptions(
  survivors: Option[],
  ballots: Ballot[],
  participantIds: string[] = [],
): ScoreRow[] {
  const ranked = new Set(ballots.map((b) => b.participant_id))
  const defaultOrder = [...survivors]
    .sort((x, y) => x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id))
    .map((o) => o.id)
  ballots = [
    ...ballots,
    ...participantIds
      .filter((id) => !ranked.has(id))
      .map((id) => ({ participant_id: id, session_id: '', ranking: defaultOrder, locked: true })),
  ]
  const n = survivors.length
  const rows = new Map<string, ScoreRow>(
    survivors.map((option) => [option.id, { option, points: 0, firstPlaces: 0 }]),
  )
  for (const ballot of ballots) {
    const order = ballot.ranking.filter((id) => rows.has(id))
    order.forEach((id, index) => {
      const row = rows.get(id)!
      row.points += n - index
      if (index === 0) row.firstPlaces += 1
    })
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      a.option.created_at.localeCompare(b.option.created_at) ||
      a.option.id.localeCompare(b.option.id),
  )
}
