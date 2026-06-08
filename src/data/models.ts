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
export type LegacyProductionShift = 'ma\u00c3\u00b1ana'
export type ProductionStatus = 'planificada' | 'completada' | 'cancelada'
export type ProductionRunType = 'lote' | 'preparacion'
export type LegacyProductionStatus =
  | 'previsto'
  | 'hecho'
  | 'cambiado'
  | 'cancelado'

export type ChangeLogEntry = {
  timestamp: string
  type: 'cambiado' | 'cancelado' | 'cancelada'
  detail: string
}

export type ProductionRun = {
  id: string
  date: string
  shift: ProductionShift
  runType: ProductionRunType
  batchCode?: string
  templateId?: string
  productionName?: string
  plannedUnits: number
  actualUnits?: number
  technician: string
  notes?: string
  incidents?: string
  status: ProductionStatus
  changeLog?: ChangeLogEntry[]
  createdAt: string
  updatedAt: string
}

export const normalizeProductionStatus = (
  status: ProductionStatus | LegacyProductionStatus | string,
): ProductionStatus => {
  switch (status) {
    case 'hecho':
    case 'completada':
      return 'completada'
    case 'cancelado':
    case 'cancelada':
      return 'cancelada'
    case 'previsto':
    case 'cambiado':
    case 'planificada':
    default:
      return 'planificada'
  }
}

export const normalizeProductionShift = (
  shift: ProductionShift | LegacyProductionShift | string,
): ProductionShift => (shift === 'tarde' ? 'tarde' : 'mañana')

export const normalizeProductionRunType = (
  runType: ProductionRunType | string | undefined,
): ProductionRunType => (runType === 'preparacion' ? 'preparacion' : 'lote')

export const normalizeProductionRun = <
  T extends { shift: string; status: string; runType?: string },
>(
  run: T,
): T & {
  shift: ProductionShift
  status: ProductionStatus
  runType: ProductionRunType
} => ({
  ...run,
  shift: normalizeProductionShift(run.shift),
  status: normalizeProductionStatus(run.status),
  runType: normalizeProductionRunType(run.runType),
})

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

export type Technician = {
  id: string
  initials: string
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

export type NewTechnician = Omit<Technician, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export type UpdateTechnician = Partial<Omit<Technician, 'id' | 'createdAt'>>

