import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Calendar from '../pages/Calendar'
import Notes from '../pages/Notes'
import Productions from '../pages/Productions'
import Settings from '../pages/Settings'
import Technicians from '../pages/Technicians'
import Templates from '../pages/Templates'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Navigate to="/lotes" replace />} />
        <Route path="lotes" element={<Templates />} />
        <Route path="producciones" element={<Productions />} />
        <Route path="calendario" element={<Calendar />} />
        <Route path="notas" element={<Notes />} />
        <Route path="tecnicos" element={<Technicians />} />
        <Route path="ajustes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/lotes" replace />} />
    </Routes>
  )
}
