import { NavLink } from 'react-router-dom'
import { tabs } from '../routes/tabs'

export default function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Navegación principal">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `tab-link${isActive ? ' active' : ''}`
          }
        >
          <span className="tab-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
