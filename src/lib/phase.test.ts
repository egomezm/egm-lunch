import { describe, expect, it } from 'vitest'
import { formatRemaining, getPhase } from './phase'

const session = { suggest_ends_at: '2026-01-01T12:00:00Z', rank_seconds: 60 }
const t = (iso: string) => Date.parse(iso)

describe('getPhase', () => {
  it('moves suggest -> rank -> results by time', () => {
    expect(getPhase(session, t('2026-01-01T11:59:59Z'))).toBe('suggest')
    expect(getPhase(session, t('2026-01-01T12:00:00Z'))).toBe('rank')
    expect(getPhase(session, t('2026-01-01T12:00:59Z'))).toBe('rank')
    expect(getPhase(session, t('2026-01-01T12:01:00Z'))).toBe('results')
  })
})

describe('formatRemaining', () => {
  it('formats minutes and hours', () => {
    expect(formatRemaining(61_000)).toBe('01:01')
    expect(formatRemaining(3_725_000)).toBe('1:02:05')
    expect(formatRemaining(-5)).toBe('00:00')
  })
})
