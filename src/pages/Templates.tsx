import { useEffect, useMemo, useState } from 'react'
import type { BatchTemplate, MaterialItem } from '../data/models'
import {
  createBatchTemplate,
  deleteBatchTemplate,
  listBatchTemplates,
  updateBatchTemplate,
} from '../data/repository'

type TemplateFormState = {
  id?: string
  name: string
  tagsText: string
  materials: Array<MaterialItem & { id: string }>
}

const createMaterialId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createMaterialRow = (material?: MaterialItem) => ({
  id: createMaterialId(),
  name: material?.name ?? '',
  notes: material?.notes ?? '',
})

const emptyForm: TemplateFormState = {
  name: '',
  tagsText: '',
  materials: [createMaterialRow()],
}

export default function Templates() {
  const [templates, setTemplates] = useState<BatchTemplate[]>([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<TemplateFormState>(emptyForm)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const loadTemplates = async () => {
    const data = await listBatchTemplates()
    setTemplates(data)
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return templates
    return templates.filter((template) => {
      const nameMatch = template.name.toLowerCase().includes(query)
      const materialMatch = template.materials.some((material) =>
        material.name.toLowerCase().includes(query),
      )
      return nameMatch || materialMatch
    })
  }, [search, templates])

  const resetForm = () => {
    setForm(emptyForm)
    setError('')
    setShowForm(false)
  }

  const handleSave = async () => {
    const trimmedName = form.name.trim()
    const materials = form.materials
      .map((material) => ({
        name: material.name.trim(),
        notes: material.notes?.trim() || undefined,
      }))
      .filter((material) => material.name.length > 0)

    if (!trimmedName) {
      setError('El nombre es obligatorio.')
      return
    }
    if (materials.length === 0) {
      setError('Agrega al menos una materia prima.')
      return
    }

    const tags = form.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    if (form.id) {
      await updateBatchTemplate(form.id, {
        name: trimmedName,
        tags: tags.length ? tags : undefined,
        materials,
      })
    } else {
      await createBatchTemplate({
        name: trimmedName,
        tags: tags.length ? tags : undefined,
        materials,
      })
    }

    await loadTemplates()
    resetForm()
  }

  const handleEdit = (template: BatchTemplate) => {
    setForm({
      id: template.id,
      name: template.name,
      tagsText: template.tags?.join(', ') ?? '',
      materials:
        template.materials.length > 0
          ? template.materials.map((material) => createMaterialRow(material))
          : [createMaterialRow()],
    })
    setError('')
    setShowForm(true)
  }

  const handleDelete = async (template: BatchTemplate) => {
    const confirmed = window.confirm(
      `¿Eliminar la plantilla "${template.name}"?`,
    )
    if (!confirmed) return
    await deleteBatchTemplate(template.id)
    await loadTemplates()
    if (form.id === template.id) {
      resetForm()
    }
  }

  const updateMaterial = (index: number, changes: Partial<MaterialItem>) => {
    setForm((prev) => {
      const updated = [...prev.materials]
      updated[index] = { ...updated[index], ...changes }
      return { ...prev, materials: updated }
    })
  }

  const addMaterial = () => {
    setForm((prev) => ({
      ...prev,
      materials: [...prev.materials, createMaterialRow()],
    }))
  }

  const removeMaterial = (index: number) => {
    setForm((prev) => {
      const updated = prev.materials.filter((_, idx) => idx !== index)
      return {
        ...prev,
        materials: updated.length > 0 ? updated : [createMaterialRow()],
      }
    })
  }

  return (
    <>
      <section className="card">
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? 'Cerrar formulario' : 'Crear lote'}
        </button>
      </section>

      {showForm ? (
        <section className="card">
          <h3>{form.id ? 'Editar lote' : 'Crear lote'}</h3>
          <div className="form-grid">
            <div className="form-row">
              <label className="form-label" htmlFor="templateName">
                Nombre
              </label>
              <input
                id="templateName"
                className="form-input"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ej: Lote pan artesanal"
              />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="templateTags">
                Tags (opcional)
              </label>
              <input
                id="templateTags"
                className="form-input"
                value={form.tagsText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tagsText: event.target.value }))
                }
                placeholder="pan, diario"
              />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Materias primas</label>
            <div className="material-list">
              {form.materials.map((material, index) => (
                <div className="material-row" key={material.id}>
                  <input
                    className="form-input"
                    placeholder="Nombre"
                    value={material.name}
                    onChange={(event) =>
                      updateMaterial(index, { name: event.target.value })
                    }
                  />
                  <input
                    className="form-input"
                    placeholder="Notas (opcional)"
                    value={material.notes ?? ''}
                    onChange={(event) =>
                      updateMaterial(index, { notes: event.target.value })
                    }
                  />
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => removeMaterial(index)}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={addMaterial}
            >
              + Añadir materia prima
            </button>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="form-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleSave}
            >
              {form.id ? 'Guardar cambios' : 'Guardar lote'}
            </button>
            <button className="ghost-button" type="button" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="form-row">
          <label className="form-label" htmlFor="searchTemplates">
            Buscar lotes
          </label>
          <input
            id="searchTemplates"
            className="form-input"
            type="search"
            placeholder="Nombre o materia prima"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      <section className="card">
        <h3>Lotes guardados</h3>
        {filteredTemplates.length === 0 ? (
          <p>No hay lotes que mostrar.</p>
        ) : (
          <div className="list">
            {filteredTemplates.map((template) => (
              <article key={template.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">{template.name}</div>
                  <div className="list-item-subtitle">
                    {template.materials.map((material) => material.name).join(', ')}
                  </div>
                  {template.tags && template.tags.length > 0 ? (
                    <div className="tag-row">
                      {template.tags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="list-item-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleEdit(template)}
                  >
                    Editar
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => handleDelete(template)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
