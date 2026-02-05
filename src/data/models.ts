export type MaterialItem = {
  name: string
  notes?: string
}

export type BatchTemplate = {
  id: string
  name: string
  tags?: string[]
  materials: MaterialItem[]
  createdAt: string
  updatedAt: string
}

export type ProductionShift = 'mañana' | 'tarde'
export type ProductionStatus = 'previsto' | 'hecho' | 'cambiado' | 'cancelado'

export type ChangeLogEntry = {
  timestamp: string
  type: 'cambiado' | 'cancelado'
  detail: string
}

export type ProductionRun = {
  id: string
  date: string
  shift: ProductionShift
  batchCode: string
  templateId: string
  plannedUnits: number
  actualUnits?: number
  technician: string
  notes?: string
  status: ProductionStatus
  changeLog?: ChangeLogEntry[]
  createdAt: string
  updatedAt: string
}

export type NoteCategory =
  | 'propuesta'
  | 'incidencia'
  | 'recordatorio'
  | 'otro'

export type NoteEvent = {
  id: string
  date: string
  title: string
  body?: string
  category: NoteCategory
  createdAt: string
  updatedAt: string
}

export type NewBatchTemplate = Omit<BatchTemplate, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export type UpdateBatchTemplate = Partial<
  Omit<BatchTemplate, 'id' | 'createdAt'>
>

export type NewProductionRun = Omit<
  ProductionRun,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string
}

export type UpdateProductionRun = Partial<
  Omit<ProductionRun, 'id' | 'createdAt'>
>

export type NewNoteEvent = Omit<NoteEvent, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export type UpdateNoteEvent = Partial<Omit<NoteEvent, 'id' | 'createdAt'>>
