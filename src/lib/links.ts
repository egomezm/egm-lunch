export function sessionLink(code: string): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/options?code=${code}`
}

export function isValidUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value.trim())
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}
