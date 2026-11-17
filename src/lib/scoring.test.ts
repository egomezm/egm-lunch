import { describe, expect, it } from 'vitest'
import { everythingVetoed, scoreOptions, survivingOptions } from './scoring'
import type { Ballot, Option, Veto } from './types'

const opt = (id: string, name: string): Option => ({
  id,
  name,
  session_id: 's',
  participant_id: 'p',
  url: null,
  created_at: '',
})
const veto = (option_id: string): Veto => ({ option_id, participant_id: 'x', session_id: 's' })
const ballot = (participant_id: string, ranking: string[]): Ballot => ({
  participant_id,
  session_id: 's',
  ranking,
  locked: true,
})

const a = opt('a', 'Tacos')
const b = opt('b', 'Pizza')
const c = opt('c', 'Sushi')

describe('survivingOptions', () => {
  it('removes options with at least one veto', () => {
    expect(survivingOptions([a, b, c], [veto('b')]).map((o) => o.id)).toEqual(['a', 'c'])
  })

  it('restores the least-vetoed options when everything is vetoed', () => {
    const vetoes = [veto('a'), veto('a'), veto('b'), veto('c'), veto('c')]
    expect(survivingOptions([a, b, c], vetoes).map((o) => o.id)).toEqual(['b'])
    expect(everythingVetoed([a, b, c], vetoes)).toBe(true)
  })
})

describe('scoreOptions', () => {
  it('uses Borda points (N for first, 1 for last)', () => {
    const rows = scoreOptions(
      [a, b, c],
      [ballot('1', ['a', 'b', 'c']), ballot('2', ['b', 'a', 'c'])],
    )
    expect(rows.map((r) => [r.option.id, r.points])).toEqual([
      ['b', 5],
      ['a', 5],
      ['c', 2],
    ])
  })

  it('breaks ties by first places, then alphabetically', () => {
    const byFirst = scoreOptions([a, b], [ballot('1', ['b', 'a']), ballot('2', ['a', 'b'])])
    expect(byFirst.map((r) => r.option.name)).toEqual(['Pizza', 'Tacos'])

    const three = scoreOptions(
      [a, b, c],
      [ballot('1', ['a', 'b', 'c']), ballot('2', ['b', 'c', 'a']), ballot('3', ['c', 'a', 'b'])],
    )
    expect(three.map((r) => r.option.name)).toEqual(['Pizza', 'Sushi', 'Tacos'])
  })

  it('ignores vetoed options inside ballots and handles no ballots', () => {
    const rows = scoreOptions([a, c], [ballot('1', ['b', 'c', 'a'])])
    expect(rows.map((r) => [r.option.id, r.points])).toEqual([
      ['c', 2],
      ['a', 1],
    ])
    expect(scoreOptions([a], []).map((r) => r.points)).toEqual([0])
  })
})
