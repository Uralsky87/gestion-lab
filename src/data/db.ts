import Dexie from 'dexie'
import type { BatchTemplate, NoteEvent, ProductionRun, Technician } from './models'

export class GestionLabDB extends Dexie {
  batchTemplates!: Dexie.Table<BatchTemplate, string>
  productionRuns!: Dexie.Table<ProductionRun, string>
  noteEvents!: Dexie.Table<NoteEvent, string>
  technicians!: Dexie.Table<Technician, string>

  constructor() {
    super('gestion-lab-db')

    this.version(1).stores({
      batchTemplates: '&id, name, *tags, createdAt, updatedAt',
      productionRuns:
        '&id, date, shift, batchCode, templateId, technician, status, createdAt, updatedAt',
      noteEvents: '&id, date, category, createdAt, updatedAt',
    })

    this.version(2).stores({
      batchTemplates: '&id, name, *tags, createdAt, updatedAt',
      productionRuns:
        '&id, date, shift, batchCode, templateId, technician, status, createdAt, updatedAt',
      noteEvents: '&id, date, category, createdAt, updatedAt',
      technicians: '&id, initials, createdAt, updatedAt',
    })
  }
}

export const db = new GestionLabDB()
