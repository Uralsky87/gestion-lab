import Dexie from 'dexie'
import {
  normalizeProductionShift,
  normalizeProductionStatus,
  type BatchTemplate,
  type NoteEvent,
  type ProductionRun,
  type Technician,
} from './models'

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

    this.version(3)
      .stores({
        batchTemplates: '&id, name, *tags, createdAt, updatedAt',
        productionRuns:
          '&id, date, shift, batchCode, templateId, technician, status, createdAt, updatedAt',
        noteEvents: '&id, date, category, createdAt, updatedAt',
        technicians: '&id, initials, createdAt, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('productionRuns')
          .toCollection()
          .modify((run) => {
            run.status = normalizeProductionStatus(run.status)
          }),
      )

    this.version(4)
      .stores({
        batchTemplates: '&id, name, *tags, createdAt, updatedAt',
        productionRuns:
          '&id, date, shift, batchCode, templateId, technician, status, createdAt, updatedAt',
        noteEvents: '&id, date, category, createdAt, updatedAt',
        technicians: '&id, initials, createdAt, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('productionRuns')
          .toCollection()
          .modify((run) => {
            run.shift = normalizeProductionShift(run.shift)
            run.status = normalizeProductionStatus(run.status)
          }),
      )

    this.version(5)
      .stores({
        batchTemplates: '&id, name, *tags, createdAt, updatedAt',
        productionRuns:
          '&id, date, shift, runType, batchCode, templateId, productionName, technician, status, createdAt, updatedAt',
        noteEvents: '&id, date, category, createdAt, updatedAt',
        technicians: '&id, initials, createdAt, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('productionRuns')
          .toCollection()
          .modify((run) => {
            run.runType = run.runType === 'preparacion' ? 'preparacion' : 'lote'
            run.shift = normalizeProductionShift(run.shift)
            run.status = normalizeProductionStatus(run.status)
          }),
      )
  }
}

export const db = new GestionLabDB()
