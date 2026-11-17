import { useState } from 'react'

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export function Favicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  const host = hostOf(url)
  if (!host) return null
  return failed ? (
    <span className="favicon fallback" aria-hidden="true">
      🍴
    </span>
  ) : (
    <img
      className="favicon"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function PlaceLink({ name, url }: { name: string; url: string | null }) {
  if (!url || !hostOf(url)) return <span className="place">{name}</span>
  return (
    <a className="place" href={url} target="_blank" rel="noreferrer noopener">
      <Favicon url={url} />
      {name}
      <span aria-hidden="true"> ↗</span>
    </a>
  )
}
