const CLIENT_KEY = 'egm-lunch:client-id'
const THEME_KEY = 'egm-lunch:theme'
const HISTORY_KEY = 'egm-lunch:history'
const HISTORY_LIMIT = 30

export interface PastPlace {
  name: string
  url: string
}

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CLIENT_KEY, id)
  }
  return id
}

const nameKey = (code: string) => `egm-lunch:name:${code}`
export const getSavedName = (code: string) => localStorage.getItem(nameKey(code)) ?? ''
export const saveName = (code: string, name: string) => localStorage.setItem(nameKey(code), name)

export function getHistory(): PastPlace[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as PastPlace[]) : []
  } catch {
    return []
  }
}

export function rememberPlace(place: PastPlace) {
  const key = place.name.trim().toLowerCase()
  const rest = getHistory().filter((p) => p.name.trim().toLowerCase() !== key)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([place, ...rest].slice(0, HISTORY_LIMIT)))
}

export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
}
