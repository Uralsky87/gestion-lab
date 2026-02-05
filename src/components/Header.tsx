type HeaderProps = {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-title">{title}</div>
      <div className="app-subtitle">Control personal de producción</div>
    </header>
  )
}
