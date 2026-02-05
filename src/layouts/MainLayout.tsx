import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import TabBar from '../components/TabBar'
import { tabs } from '../routes/tabs'

export default function MainLayout() {
  const location = useLocation()
  const activeTab =
    tabs.find((tab) => location.pathname.startsWith(tab.path)) ?? tabs[0]

  return (
    <div className="app-shell">
      <Header title={activeTab.label} />
      <TabBar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
