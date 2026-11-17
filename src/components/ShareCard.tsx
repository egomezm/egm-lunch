import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { sessionLink } from '../lib/links'

export function ShareCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = sessionLink(code)

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="share">
      <div className="qr" aria-label={`QR code for session ${code}`}>
        <QRCodeSVG value={link} size={168} marginSize={2} />
      </div>
      <div className="share-info">
        <span className="eyebrow">Session code</span>
        <strong className="code">{code}</strong>
        <input readOnly value={link} aria-label="Session link" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-primary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy invite link'}
        </button>
      </div>
    </div>
  )
}
