import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'
import footerLogo from '../assets/footer-logo.png'

export function BrandHeader() {
  return (
    <header className="brand-bar">
      <Link to="/" className="brand" aria-label="Lunch Picker home">
        <img className="soft-shadow" src={logo} alt="" width={48} height={48} />
        <span className="gradient-text soft-shadow">Lunch Picker</span>
      </Link>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="floating-footer">
      <a href="https://github.com/egomezm" target="_blank" rel="noreferrer noopener">
        <img src={footerLogo} alt="" width={16} height={16} />
        <span>App created by Eduardo Gomez</span>
      </a>
    </footer>
  )
}
