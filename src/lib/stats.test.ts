import { describe, expect, it } from 'vitest'
import { isValidUrl } from './links'
import { buildStats, suggestablePlaces, type RawHistory } from './stats'

const session = (id: string, created: string) => ({
  id,
  code: id,
  name: id,
  creator_id: 'c',
  suggest_ends_at: '2026-01-01T00:00:00Z',
  veto_seconds: 0,
  rank_seconds: 0,
  created_at: created,
})
const option = (id: string, sid: string, name: string, url: string | null) => ({
  id,
  session_id: sid,
  participant_id: 'p',
  name,
  url,
  created_at: '',
})

describe('stats', () => {
  it('validates urls', () => {
    expect(isValidUrl('https://tacos.com/menu')).toBe(true)
    expect(isValidUrl('tacos')).toBe(false)
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('javascript:alert(1)')).toBe(false)
  })

  it('suggests only past non-winners that have a valid url', () => {
    const raw: RawHistory = {
      sessions: [session('s1', '2026-01-01T00:00:00Z')],
      participants: [],
      options: [
        option('a', 's1', 'Tacos', 'https://tacos.com'),
        option('b', 's1', 'Pizza', 'https://pizza.com'),
        option('c', 's1', 'Soup', 'not a url'),
      ],
      vetoes: [],
      ballots: [{ participant_id: 'p', session_id: 's1', ranking: ['a', 'b', 'c'], locked: true }],
      reviews: [],
    }
    const stats = buildStats(raw, Date.parse('2026-02-01T00:00:00Z'))
    expect(stats.places.find((p) => p.name === 'Tacos')?.wins).toBe(1)
    expect(suggestablePlaces(stats, new Set()).map((p) => p.name)).toEqual(['Pizza'])
    expect(suggestablePlaces(stats, new Set(['pizza']))).toEqual([])
  })
})
