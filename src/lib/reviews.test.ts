import { describe, expect, it } from 'vitest'
import { averages } from './reviews'

const review = (n: number) => ({
  participant_id: String(n),
  session_id: 's',
  option_id: null,
  food_quality: n,
  ambience: n,
  price: n,
  location_parking: n,
  repeatable: n,
  comment: '',
})

describe('averages', () => {
  it('returns null with no reviews', () => {
    expect(averages([])).toBeNull()
  })
  it('averages each category', () => {
    expect(averages([review(2), review(5)])?.price).toBe(3.5)
  })
})
