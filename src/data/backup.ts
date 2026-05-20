import {
  normalizeProductionRun,
  type BatchTemplate,
  type NoteEvent,
  type ProductionRun,
  type Technician,
} from './models'
import { db } from './db'

export const SCHEMA_VERSION = 4

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

export type BackupPayloadV3 = {
  schemaVersion: 3
  exportedAt: string
  data: {
    batchTemplates: BatchTemplate[]
    productionRuns: ProductionRun[]
    noteEvents: NoteEvent[]
    technicians: Technician[]
  }
}

export type BackupPayloadV4 = {
  schemaVersion: 4
  exportedAt: string
  data: {
    batchTemplates: BatchTemplate[]
    productionRuns: ProductionRun[]
    noteEvents: NoteEvent[]
    technicians: Technician[]
  }
}

export type BackupPayload =
  | BackupPayloadV1
  | BackupPayloadV2
  | BackupPayloadV3
  | BackupPayloadV4

export const exportBackup = async (): Promise<BackupPayloadV4> => {
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
      productionRuns: productionRuns.map(normalizeProductionRun),
      noteEvents,
      technicians,
    },
  }
}

const isArray = (value: unknown): value is unknown[] => Array.isArray(value)

export const validateBackup = (payload: unknown): payload is BackupPayload => {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as BackupPayload
  if (
    record.schemaVersion !== 1 &&
    record.schemaVersion !== 2 &&
    record.schemaVersion !== 3 &&
    record.schemaVersion !== 4
  ) {
    return false
  }
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
    record.data as
      | BackupPayloadV2['data']
      | BackupPayloadV3['data']
      | BackupPayloadV4['data']

  return (
    isArray(batchTemplates) &&
    isArray(productionRuns) &&
    isArray(noteEvents) &&
    isArray(technicians)
  )
}

export const migrateBackup = (payload: BackupPayload): BackupPayloadV4 => {
  switch (payload.schemaVersion) {
    case 1:
      return {
        schemaVersion: 4,
        exportedAt: payload.exportedAt,
        data: {
          batchTemplates: payload.data.batchTemplates,
          productionRuns: payload.data.productionRuns.map(normalizeProductionRun),
          noteEvents: payload.data.noteEvents,
          technicians: [],
        },
      }
    case 2:
      return {
        schemaVersion: 4,
        exportedAt: payload.exportedAt,
        data: {
          batchTemplates: payload.data.batchTemplates,
          productionRuns: payload.data.productionRuns.map(normalizeProductionRun),
          noteEvents: payload.data.noteEvents,
          technicians: payload.data.technicians,
        },
      }
    case 3:
      return {
        schemaVersion: 4,
        exportedAt: payload.exportedAt,
        data: {
          batchTemplates: payload.data.batchTemplates,
          productionRuns: payload.data.productionRuns.map(normalizeProductionRun),
          noteEvents: payload.data.noteEvents,
          technicians: payload.data.technicians,
        },
      }
    case 4:
    default:
      return {
        ...payload,
        data: {
          ...payload.data,
          productionRuns: payload.data.productionRuns.map(normalizeProductionRun),
        },
      }
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
