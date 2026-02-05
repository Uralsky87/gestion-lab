export type TabItem = {
  path: string
  label: string
  icon: string
}

export const tabs: TabItem[] = [
  { path: '/plantillas', label: 'Plantillas', icon: 'PL' },
  { path: '/producciones', label: 'Producciones', icon: 'PR' },
  { path: '/calendario', label: 'Calendario', icon: 'CA' },
  { path: '/notas', label: 'Notas', icon: 'NO' },
  { path: '/ajustes', label: 'Ajustes', icon: 'AJ' },
]
