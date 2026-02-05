import { db } from './db'
import type {
  BatchTemplate,
  NewBatchTemplate,
  NewNoteEvent,
  NewProductionRun,
  NewTechnician,
  NoteEvent,
  ProductionRun,
  Technician,
  UpdateBatchTemplate,
  UpdateNoteEvent,
  UpdateProductionRun,
  UpdateTechnician,
} from './models'

const nowIso = () => new Date().toISOString()
const ensureId = (id?: string) => id ?? crypto.randomUUID()

export async function createBatchTemplate(
  input: NewBatchTemplate,
): Promise<BatchTemplate> {
  const timestamp = nowIso()
  const item: BatchTemplate = {
    id: ensureId(input.id),
    name: input.name,
    tags: input.tags,
    materials: input.materials,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.batchTemplates.add(item)
  return item
}

export async function updateBatchTemplate(
  id: string,
  changes: UpdateBatchTemplate,
): Promise<BatchTemplate | undefined> {
  await db.batchTemplates.update(id, { ...changes, updatedAt: nowIso() })
  return db.batchTemplates.get(id)
}

export function deleteBatchTemplate(id: string) {
  return db.batchTemplates.delete(id)
}

export function getBatchTemplate(id: string) {
  return db.batchTemplates.get(id)
}

export function listBatchTemplates() {
  return db.batchTemplates.orderBy('updatedAt').reverse().toArray()
}

export async function createProductionRun(
  input: NewProductionRun,
): Promise<ProductionRun> {
  const timestamp = nowIso()
  const item: ProductionRun = {
    id: ensureId(input.id),
    date: input.date,
    shift: input.shift,
    batchCode: input.batchCode,
    templateId: input.templateId,
    plannedUnits: input.plannedUnits,
    actualUnits: input.actualUnits,
    technician: input.technician,
    notes: input.notes,
    status: input.status,
    changeLog: input.changeLog,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.productionRuns.add(item)
  return item
}

export async function updateProductionRun(
  id: string,
  changes: UpdateProductionRun,
): Promise<ProductionRun | undefined> {
  await db.productionRuns.update(id, { ...changes, updatedAt: nowIso() })
  return db.productionRuns.get(id)
}

export function deleteProductionRun(id: string) {
  return db.productionRuns.delete(id)
}

export function getProductionRun(id: string) {
  return db.productionRuns.get(id)
}

export function listProductionRuns() {
  return db.productionRuns.orderBy('date').reverse().toArray()
}

export function listProductionRunsByDate(date: string) {
  return db.productionRuns.where('date').equals(date).toArray()
}

export function listProductionRunsByTechnician(technician: string) {
  return db.productionRuns.where('technician').equals(technician).toArray()
}

export function listProductionRunsByTemplate(templateId: string) {
  return db.productionRuns.where('templateId').equals(templateId).toArray()
}

export function getProductionRunByBatchCode(batchCode: string) {
  return db.productionRuns.where('batchCode').equals(batchCode).first()
}

export async function createNoteEvent(
  input: NewNoteEvent,
): Promise<NoteEvent> {
  const timestamp = nowIso()
  const item: NoteEvent = {
    id: ensureId(input.id),
    date: input.date,
    title: input.title,
    body: input.body,
    category: input.category,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.noteEvents.add(item)
  return item
}

export async function updateNoteEvent(
  id: string,
  changes: UpdateNoteEvent,
): Promise<NoteEvent | undefined> {
  await db.noteEvents.update(id, { ...changes, updatedAt: nowIso() })
  return db.noteEvents.get(id)
}

export function deleteNoteEvent(id: string) {
  return db.noteEvents.delete(id)
}

export function getNoteEvent(id: string) {
  return db.noteEvents.get(id)
}

export function listNoteEvents() {
  return db.noteEvents.orderBy('date').reverse().toArray()
}

export function listNoteEventsByCategory(category: NoteEvent['category']) {
  return db.noteEvents.where('category').equals(category).toArray()
}

export async function createTechnician(
  input: NewTechnician,
): Promise<Technician> {
  const timestamp = nowIso()
  const item: Technician = {
    id: ensureId(input.id),
    initials: input.initials,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.technicians.add(item)
  return item
}

export async function updateTechnician(
  id: string,
  changes: UpdateTechnician,
): Promise<Technician | undefined> {
  await db.technicians.update(id, { ...changes, updatedAt: nowIso() })
  return db.technicians.get(id)
}

export function deleteTechnician(id: string) {
  return db.technicians.delete(id)
}

export function getTechnician(id: string) {
  return db.technicians.get(id)
}

export function listTechnicians() {
  return db.technicians.orderBy('initials').toArray()
}
