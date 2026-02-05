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

  return (
    <>
      <section className="card">
        <h3>{form.id ? 'Editar técnico' : 'Nuevo técnico'}</h3>
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
          <button className="primary-button" type="button" onClick={handleSave}>
            {form.id ? 'Guardar cambios' : 'Guardar técnico'}
          </button>
          <button className="ghost-button" type="button" onClick={resetForm}>
            Cancelar
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Listado</h3>
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
                  {item.runs.length > 0 ? (
                    <div className="tech-notes">
                      {item.runs.map((run) => (
                        <div key={run.id} className="tech-note">
                          <strong>{run.batchCode}</strong> · {run.date}
                          {run.notes ? ` — ${run.notes}` : ''}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="list-item-subtitle">Sin lotes asociados.</div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
