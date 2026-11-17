import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'

export function BrandHeader() {
  return (
    <header className="brand-bar">
      <Link to="/" className="brand" aria-label="Lunch Picker home">
        <img src={logo} alt="" width={36} height={36} />
        <span>Lunch Picker</span>
      </Link>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="floating-footer">
      <a href="https://github.com/egomezm" target="_blank" rel="noreferrer noopener">
        <img src={logo} alt="" width={16} height={16} />
        <span>App created by Eduardo Gomez</span>
      </a>
    </footer>
  )
}
