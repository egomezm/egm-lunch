import { isValidUrl } from './links'
import { getPhase } from './phase'
import { CATEGORIES, type RatingKey } from './reviews'
import { scoreOptions, survivingOptions } from './scoring'
import type { Ballot, Option, Participant, Review, Session, Veto } from './types'

export interface RawHistory {
  sessions: Session[]
  participants: Participant[]
  options: Option[]
  vetoes: Veto[]
  ballots: Ballot[]
  reviews: Review[]
}

export interface PlaceStat {
  key: string
  name: string
  url: string | null
  suggested: number
  wins: number
  vetoed: number
  reviews: number
  rating: number | null
  lastSeen: string
  suggestedBy: string | null
}

export interface UserStat {
  key: string
  name: string
  sessions: number
  suggested: number
  wins: number
}

export interface SessionSummary {
  code: string
  name: string
  date: string
  participants: number
  winner: string | null
  suggestedBy: string | null
}

export interface Stats {
  finishedSessions: number
  participants: number
  places: PlaceStat[]
  users: UserStat[]
  reviewCount: number
  categoryAverages: Record<RatingKey, number> | null
  recent: SessionSummary[]
}

export const placeKey = (name: string) => name.trim().toLowerCase()

export function buildStats(raw: RawHistory, now = Date.now()): Stats {
  const optionsBySession = group(raw.options, (o) => o.session_id)
  const vetoesBySession = group(raw.vetoes, (v) => v.session_id)
  const ballotsBySession = group(raw.ballots, (b) => b.session_id)
  const optionById = new Map(raw.options.map((o) => [o.id, o]))
  const places = new Map<string, PlaceStat>()
  const placeOf = (o: Option) => {
    const key = placeKey(o.name)
    let p = places.get(key)
    if (!p) {
      p = {
        key,
        name: o.name.trim(),
        url: null,
        suggested: 0,
        wins: 0,
        vetoed: 0,
        reviews: 0,
        rating: null,
        lastSeen: '',
        suggestedBy: null,
      }
      places.set(key, p)
    }
    return p
  }

  const participantById = new Map(raw.participants.map((p) => [p.id, p]))
  const users = new Map<string, UserStat>()
  const userOf = (participantId: string) => {
    const part = participantById.get(participantId)
    if (!part) return null
    let u = users.get(part.client_id)
    if (!u) {
      u = { key: part.client_id, name: part.name.trim(), sessions: 0, suggested: 0, wins: 0 }
      users.set(part.client_id, u)
    }
    u.name = part.name.trim() || u.name
    return u
  }
  const seenInSession = new Set<string>()
  const suggesterName = (o: Option) => participantById.get(o.participant_id)?.name.trim() || null

  const recent: SessionSummary[] = []
  const sorted = [...raw.sessions].sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const s of sorted) {
    const options = optionsBySession.get(s.id) ?? []
    for (const part of raw.participants) {
      if (part.session_id !== s.id || seenInSession.has(s.id + part.client_id)) continue
      seenInSession.add(s.id + part.client_id)
      userOf(part.id)!.sessions += 1
    }
    for (const o of options) {
      const p = placeOf(o)
      p.suggested += 1
      const u = userOf(o.participant_id)
      if (u) u.suggested += 1
      if (s.created_at >= p.lastSeen) {
        p.lastSeen = s.created_at
        p.name = o.name.trim()
        p.suggestedBy = suggesterName(o)
      }
      if (isValidUrl(o.url) && s.created_at >= p.lastSeen) p.url = o.url.trim()
      else if (isValidUrl(o.url) && !p.url) p.url = o.url.trim()
    }
    for (const v of vetoesBySession.get(s.id) ?? []) {
      const o = optionById.get(v.option_id)
      if (o) placeOf(o).vetoed += 1
    }
    if (getPhase(s, now) !== 'results') continue
    const rows = scoreOptions(
      survivingOptions(options, vetoesBySession.get(s.id) ?? []),
      ballotsBySession.get(s.id) ?? [],
      raw.participants.filter((p) => p.session_id === s.id).map((p) => p.id),
    )
    const winner = rows[0]?.option
    if (winner) {
      placeOf(winner).wins += 1
      const u = userOf(winner.participant_id)
      if (u) u.wins += 1
    }
    recent.push({
      code: s.code,
      name: s.name,
      date: s.created_at,
      participants: raw.participants.filter((p) => p.session_id === s.id).length,
      winner: winner?.name.trim() ?? null,
      suggestedBy: winner ? suggesterName(winner) : null,
    })
  }

  const byPlace = new Map<string, Review[]>()
  for (const r of raw.reviews) {
    const o = r.option_id ? optionById.get(r.option_id) : undefined
    if (!o) continue
    const key = placeKey(o.name)
    byPlace.set(key, [...(byPlace.get(key) ?? []), r])
  }
  for (const [key, list] of byPlace) {
    const p = places.get(key)
    if (!p) continue
    p.reviews = list.length
    p.rating = mean(list.map((r) => mean(CATEGORIES.map((c) => r[c.key]))))
  }

  const rated = raw.reviews.filter((r) => r.option_id)
  return {
    finishedSessions: recent.length,
    participants: new Set(raw.participants.map((p) => p.client_id)).size,
    places: [...places.values()],
    users: [...users.values()],
    reviewCount: rated.length,
    categoryAverages: rated.length
      ? (Object.fromEntries(
          CATEGORIES.map((c) => [c.key, mean(rated.map((r) => r[c.key]))]),
        ) as Record<RatingKey, number>)
      : null,
    recent: recent.reverse(),
  }
}

// Past places worth suggesting again: has a valid URL and has never won a session.
export function suggestablePlaces(stats: Stats, exclude: Set<string>): PlaceStat[] {
  return stats.places
    .filter((p) => isValidUrl(p.url) && p.wins === 0 && !exclude.has(p.key))
    .sort((a, b) => b.suggested - a.suggested || b.lastSeen.localeCompare(a.lastSeen))
}

function group<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item])
  return map
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}
