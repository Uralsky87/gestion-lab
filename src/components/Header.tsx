import { Link } from 'react-router-dom'

type HeaderProps = {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <div>
          <div className="app-title">{title}</div>
          <div className="app-subtitle">Control personal de producción</div>
        </div>
        <Link className="settings-button" to="/ajustes" aria-label="Ajustes">
          ⚙️
        </Link>
      </div>
    </header>
  )
}
