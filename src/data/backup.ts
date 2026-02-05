import type { BatchTemplate, NoteEvent, ProductionRun } from './models'
import { db } from './db'

export const SCHEMA_VERSION = 1

export type BackupPayloadV1 = {
  schemaVersion: 1
  exportedAt: string
  data: {
    batchTemplates: BatchTemplate[]
    productionRuns: ProductionRun[]
    noteEvents: NoteEvent[]
  }
}

export type BackupPayload = BackupPayloadV1

export const exportBackup = async (): Promise<BackupPayload> => {
  const [batchTemplates, productionRuns, noteEvents] = await Promise.all([
    db.batchTemplates.toArray(),
    db.productionRuns.toArray(),
    db.noteEvents.toArray(),
  ])

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      batchTemplates,
      productionRuns,
      noteEvents,
    },
  }
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value)

export const validateBackup = (payload: unknown): payload is BackupPayload => {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as BackupPayload
  if (record.schemaVersion !== 1) return false
  if (!record.data || typeof record.data !== 'object') return false

  const { batchTemplates, productionRuns, noteEvents } =
    record.data as BackupPayloadV1['data']

  return (
    isArray(batchTemplates) &&
    isArray(productionRuns) &&
    isArray(noteEvents)
  )
}

export const migrateBackup = (payload: BackupPayload): BackupPayload => {
  switch (payload.schemaVersion) {
    case 1:
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
    await db.transaction('rw', db.batchTemplates, db.productionRuns, db.noteEvents, async () => {
      await Promise.all([
        db.batchTemplates.clear(),
        db.productionRuns.clear(),
        db.noteEvents.clear(),
      ])
      await Promise.all([
        db.batchTemplates.bulkPut(migrated.data.batchTemplates),
        db.productionRuns.bulkPut(migrated.data.productionRuns),
        db.noteEvents.bulkPut(migrated.data.noteEvents),
      ])
    })
    return
  }

  await db.transaction('rw', db.batchTemplates, db.productionRuns, db.noteEvents, async () => {
    await Promise.all([
      db.batchTemplates.bulkPut(migrated.data.batchTemplates),
      db.productionRuns.bulkPut(migrated.data.productionRuns),
      db.noteEvents.bulkPut(migrated.data.noteEvents),
    ])
  })
}
