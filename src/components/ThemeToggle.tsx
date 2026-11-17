import { useState } from 'react'
import { applyTheme, getTheme, type Theme } from '../lib/storage'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getTheme)

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      className="btn btn-ghost icon-btn"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
