import type { Review } from './types'

export type RatingKey = 'food_quality' | 'ambience' | 'price' | 'location_parking' | 'repeatable'

export const CATEGORIES: { key: RatingKey; label: string; hint: string }[] = [
  { key: 'food_quality', label: 'Food quality', hint: 'Taste and freshness' },
  { key: 'ambience', label: 'Place ambience', hint: 'Atmosphere, noise, comfort' },
  { key: 'price', label: 'Price', hint: '5 = great value' },
  { key: 'location_parking', label: 'Location & parking', hint: 'Easy to reach and park' },
  { key: 'repeatable', label: 'Repeatable', hint: 'Would you come back?' },
]

export const COMMENT_MAX = 100

export function averages(reviews: Review[]): Record<RatingKey, number> | null {
  if (reviews.length === 0) return null
  const avg = (key: RatingKey) => reviews.reduce((sum, r) => sum + r[key], 0) / reviews.length
  return Object.fromEntries(CATEGORIES.map((c) => [c.key, avg(c.key)])) as Record<RatingKey, number>
}
