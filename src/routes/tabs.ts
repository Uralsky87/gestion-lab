export type TabItem = {
  path: string
  label: string
  icon: string
}

export const tabs: TabItem[] = [
  { path: '/lotes', label: 'Lotes', icon: 'LT' },
  { path: '/producciones', label: 'Producciones', icon: 'PR' },
  { path: '/calendario', label: 'Calendario', icon: 'CA' },
  { path: '/notas', label: 'Notas', icon: 'NO' },
  { path: '/tecnicos', label: 'Técnicos', icon: 'TC' },
]
