import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Calendar from '../pages/Calendar'
import Notes from '../pages/Notes'
import Productions from '../pages/Productions'
import Settings from '../pages/Settings'
import Templates from '../pages/Templates'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/plantillas" replace />} />
        <Route path="plantillas" element={<Templates />} />
        <Route path="producciones" element={<Productions />} />
        <Route path="calendario" element={<Calendar />} />
        <Route path="notas" element={<Notes />} />
        <Route path="ajustes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/plantillas" replace />} />
    </Routes>
  )
}
