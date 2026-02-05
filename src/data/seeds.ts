import { db } from './db'
import type { NewBatchTemplate } from './models'
import { createBatchTemplate } from './repository'

const seedTemplates: NewBatchTemplate[] = [
  {
    name: 'Pan artesanal básico',
    tags: ['pan', 'diario'],
    materials: [
      { name: 'Harina de trigo', notes: 'W320 preferible' },
      { name: 'Agua', notes: 'Hidratación 70%' },
      { name: 'Sal' },
      { name: 'Levadura fresca' },
    ],
  },
  {
    name: 'Galleta integral',
    tags: ['galleta', 'snack'],
    materials: [
      { name: 'Harina integral' },
      { name: 'Azúcar mascabado' },
      { name: 'Mantequilla', notes: 'A temperatura ambiente' },
    ],
  },
  {
    name: 'Granola base',
    tags: ['granola', 'lote'],
    materials: [
      { name: 'Avena' },
      { name: 'Miel' },
      { name: 'Aceite vegetal' },
      { name: 'Frutos secos', notes: 'Mezcla variable' },
    ],
  },
]

export async function seedDatabaseIfEmpty() {
  const count = await db.batchTemplates.count()
  if (count > 0) return

  for (const template of seedTemplates) {
    await createBatchTemplate(template)
  }
}
