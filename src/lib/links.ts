export function sessionLink(code: string): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/options?code=${code}`
}
