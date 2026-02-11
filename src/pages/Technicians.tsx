import { useEffect, useMemo, useState } from 'react'
import type { ProductionRun, Technician } from '../data/models'
import {
  createTechnician,
  deleteTechnician,
  listProductionRuns,
  listTechnicians,
  updateTechnician,
} from '../data/repository'

type TechnicianForm = {
  id?: string
  initials: string
}

const emptyForm: TechnicianForm = {
  initials: '',
}

export default function Technicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [runs, setRuns] = useState<ProductionRun[]>([])
  const [form, setForm] = useState<TechnicianForm>(emptyForm)
  const [error, setError] = useState('')
  const [openStats, setOpenStats] = useState<Record<string, boolean>>({})
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isListOpen, setIsListOpen] = useState(false)

  const loadData = async () => {
    const [techData, runData] = await Promise.all([
      listTechnicians(),
      listProductionRuns(),
    ])
    setTechnicians(techData)
    setRuns(runData)
  }

  useEffect(() => {
    loadData()
  }, [])

  const stats = useMemo(() => {
    return technicians.map((tech) => {
      const techRuns = runs.filter((run) => run.technician === tech.initials)
      const done = techRuns.filter((run) => run.status === 'hecho').length
      const canceled = techRuns.filter((run) => run.status === 'cancelado').length
      return {
        technician: tech,
        total: techRuns.length,
        done,
        canceled,
        runs: techRuns,
      }
    })
  }, [technicians, runs])

  const resetForm = () => {
    setForm(emptyForm)
    setError('')
    setIsFormOpen(false)
  }

  const handleSave = async () => {
    const initials = form.initials.trim().toUpperCase()
    if (!initials) {
      setError('Las iniciales son obligatorias.')
      return
    }

    if (form.id) {
      await updateTechnician(form.id, { initials })
    } else {
      await createTechnician({ initials })
    }

    await loadData()
    resetForm()
  }

  const handleEdit = (tech: Technician) => {
    setForm({ id: tech.id, initials: tech.initials })
    setError('')
    setIsFormOpen(true)
  }

  const handleDelete = async (tech: Technician) => {
    const confirmed = window.confirm(
      `¿Eliminar al técnico ${tech.initials}?`,
    )
    if (!confirmed) return
    await deleteTechnician(tech.id)
    await loadData()
    if (form.id === tech.id) {
      resetForm()
    }
  }

  const toggleStats = (id: string) => {
    setOpenStats((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleForm = () => {
    setIsFormOpen((prev) => {
      const next = !prev
      if (next) {
        setForm(emptyForm)
        setError('')
      }
      return next
    })
  }

  const toggleList = () => {
    setIsListOpen((prev) => !prev)
  }

  return (
    <>
      <section className="card">
        <div className="card-header">
          <h3>{form.id ? 'Editar técnico' : 'Nuevo técnico'}</h3>
          <button
            className="icon-button add-tech-button"
            type="button"
            onClick={toggleForm}
            aria-label="Añadir técnico"
            aria-expanded={isFormOpen}
            aria-controls="technician-form"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="9" cy="7" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M3.5 18.2c1.8-3 8.2-3 10 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M17 9.5v6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M14 12.5h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {isFormOpen ? (
          <div id="technician-form" className="form-grid">
            <div className="form-row">
              <label className="form-label" htmlFor="technicianInitials">
                Iniciales
              </label>
              <input
                id="technicianInitials"
                className="form-input"
                value={form.initials}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    initials: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="AM"
                maxLength={6}
              />
            </div>
            {error ? <div className="form-error">{error}</div> : null}
            <div className="form-actions">
              <button
                className="primary-button"
                type="button"
                onClick={handleSave}
              >
                {form.id ? 'Guardar cambios' : 'Guardar técnico'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={resetForm}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Listado de técnicos</h3>
          <div className="card-header-actions">
            <button
              className="ghost-button small-button"
              type="button"
              onClick={toggleList}
              aria-expanded={isListOpen}
              aria-controls="technician-list"
            >
              {isListOpen ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
        {isListOpen ? (
          <div id="technician-list">
            {technicians.length === 0 ? (
              <p>No hay técnicos registrados.</p>
            ) : (
              <div className="list">
                {technicians.map((tech) => (
                  <article key={tech.id} className="list-item">
                    <div className="list-item-main">
                      <div className="list-item-title">{tech.initials}</div>
                    </div>
                    <div className="list-item-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => handleEdit(tech)}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => handleDelete(tech)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="card">
        <h3>Estadísticas</h3>
        {stats.length === 0 ? (
          <p>No hay datos disponibles.</p>
        ) : (
          <div className="list">
            {stats.map((item) => (
              <article key={item.technician.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">
                    {item.technician.initials}
                  </div>
                  <div className="list-item-subtitle">
                    Lotes: {item.total} · Hechos: {item.done} · Anulados:{' '}
                    {item.canceled}
                  </div>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => toggleStats(item.technician.id)}
                  >
                    {openStats[item.technician.id]
                      ? 'Ocultar producciones'
                      : 'Ver producciones'}
                  </button>
                  {openStats[item.technician.id] ? (
                    item.runs.length > 0 ? (
                      <div className="tech-notes">
                        {item.runs.map((run) => (
                          <div key={run.id} className="tech-note">
                            <strong>{run.batchCode}</strong> · {run.date}
                            {run.notes ? ` — ${run.notes}` : ''}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="list-item-subtitle">
                        Sin lotes asociados.
                      </div>
                    )
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
