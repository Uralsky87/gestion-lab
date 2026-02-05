import type { BatchTemplate, NoteEvent, ProductionRun, Technician } from './models'
import { db } from './db'

export const SCHEMA_VERSION = 2

export type BackupPayloadV1 = {
  schemaVersion: 1
  exportedAt: string
  data: {
    batchTemplates: BatchTemplate[]
    productionRuns: ProductionRun[]
    noteEvents: NoteEvent[]
  }
}

export type BackupPayloadV2 = {
  schemaVersion: 2
  exportedAt: string
  data: {
    batchTemplates: BatchTemplate[]
    productionRuns: ProductionRun[]
    noteEvents: NoteEvent[]
    technicians: Technician[]
  }
}

export type BackupPayload = BackupPayloadV1 | BackupPayloadV2

export const exportBackup = async (): Promise<BackupPayloadV2> => {
  const [batchTemplates, productionRuns, noteEvents, technicians] =
    await Promise.all([
      db.batchTemplates.toArray(),
      db.productionRuns.toArray(),
      db.noteEvents.toArray(),
      db.technicians.toArray(),
    ])

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      batchTemplates,
      productionRuns,
      noteEvents,
      technicians,
    },
  }
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value)

export const validateBackup = (payload: unknown): payload is BackupPayload => {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as BackupPayload
  if (record.schemaVersion !== 1 && record.schemaVersion !== 2) return false
  if (!record.data || typeof record.data !== 'object') return false

  if (record.schemaVersion === 1) {
    const { batchTemplates, productionRuns, noteEvents } =
      record.data as BackupPayloadV1['data']

    return (
      isArray(batchTemplates) &&
      isArray(productionRuns) &&
      isArray(noteEvents)
    )
  }

  const { batchTemplates, productionRuns, noteEvents, technicians } =
    record.data as BackupPayloadV2['data']

  return (
    isArray(batchTemplates) &&
    isArray(productionRuns) &&
    isArray(noteEvents) &&
    isArray(technicians)
  )
}

export const migrateBackup = (payload: BackupPayload): BackupPayloadV2 => {
  switch (payload.schemaVersion) {
    case 1:
      return {
        schemaVersion: 2,
        exportedAt: payload.exportedAt,
        data: {
          batchTemplates: payload.data.batchTemplates,
          productionRuns: payload.data.productionRuns,
          noteEvents: payload.data.noteEvents,
          technicians: [],
        },
      }
    case 2:
    default:
      return payload
  }
}

export const importBackup = async (
  payload: BackupPayload,
  mode: 'merge' | 'replace',
) => {
  const migrated = migrateBackup(payload)

  if (mode === 'replace') {
    await db.transaction(
      'rw',
      db.batchTemplates,
      db.productionRuns,
      db.noteEvents,
      db.technicians,
      async () => {
        await Promise.all([
          db.batchTemplates.clear(),
          db.productionRuns.clear(),
          db.noteEvents.clear(),
          db.technicians.clear(),
        ])
        await Promise.all([
          db.batchTemplates.bulkPut(migrated.data.batchTemplates),
          db.productionRuns.bulkPut(migrated.data.productionRuns),
          db.noteEvents.bulkPut(migrated.data.noteEvents),
          db.technicians.bulkPut(migrated.data.technicians),
        ])
      },
    )
    return
  }

  await db.transaction(
    'rw',
    db.batchTemplates,
    db.productionRuns,
    db.noteEvents,
    db.technicians,
    async () => {
      await Promise.all([
        db.batchTemplates.bulkPut(migrated.data.batchTemplates),
        db.productionRuns.bulkPut(migrated.data.productionRuns),
        db.noteEvents.bulkPut(migrated.data.noteEvents),
        db.technicians.bulkPut(migrated.data.technicians),
      ])
    },
  )
}
