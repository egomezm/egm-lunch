import { describe, expect, it } from 'vitest'
import { getProgress } from './progress'

const people = ['a', 'b'].map((id) => ({ id, session_id: 's', client_id: id, name: id }))
const opt = (id: string, who: string) => ({
  id,
  session_id: 's',
  participant_id: who,
  name: id,
  url: null,
  created_at: '',
})
const threeEach = [
  ...['1', '2', '3'].map((i) => opt(`a${i}`, 'a')),
  ...['1', '2', '3'].map((i) => opt(`b${i}`, 'b')),
]
const veto = (who: string, option: string) => ({
  option_id: option,
  participant_id: who,
  session_id: 's',
})

describe('getProgress', () => {
  it('suggest is done at 3 places each; veto at all possible vetoes', () => {
    const half = { participants: people, options: threeEach.slice(0, 5), vetoes: [], ballots: [] }
    expect(getProgress('suggest', half)).toEqual({ done: 1, total: 2, everyoneDone: false })
    const full = { ...half, options: threeEach }
    expect(getProgress('suggest', full)).toEqual({ done: 2, total: 2, everyoneDone: true })

    const data = { ...full, vetoes: [veto('a', 'b1')] }
    expect(getProgress('veto', data)).toEqual({ done: 1, total: 2, everyoneDone: false })
    const all = { ...data, vetoes: [veto('a', 'b1'), veto('b', 'a1')] }
    expect(getProgress('veto', all)).toEqual({ done: 2, total: 2, everyoneDone: true })
  })

  it('rank is done when every ballot is locked', () => {
    const ballot = (who: string, locked: boolean) => ({
      participant_id: who,
      session_id: 's',
      ranking: [],
      locked,
    })
    const data = { participants: people, options: threeEach, vetoes: [] }
    expect(
      getProgress('rank', { ...data, ballots: [ballot('a', true), ballot('b', false)] }),
    ).toMatchObject({ done: 1, everyoneDone: false })
    expect(
      getProgress('rank', { ...data, ballots: [ballot('a', true), ballot('b', true)] }),
    ).toMatchObject({ done: 2, everyoneDone: true })
  })

  it('never reports done in results', () => {
    const data = { participants: people, options: [], vetoes: [], ballots: [] }
    expect(getProgress('results', data).everyoneDone).toBe(false)
  })
})
