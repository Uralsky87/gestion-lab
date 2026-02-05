import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  BatchTemplate,
  ChangeLogEntry,
  ProductionRun,
  ProductionShift,
  ProductionStatus,
  Technician,
} from '../data/models'
import {
  createProductionRun,
  deleteProductionRun,
  listBatchTemplates,
  listProductionRuns,
  listTechnicians,
  updateProductionRun,
} from '../data/repository'

type ProductionFormState = {
  id?: string
  date: string
  shift: ProductionShift
  batchCode: string
  templateId: string
  plannedUnits: string
  actualUnits: string
  technician: string
  notes: string
  status: ProductionStatus
  changeReason: string
  replacementMode: 'template' | 'text'
  replacementTemplateId: string
  replacementText: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const emptyForm = (templateId = ''): ProductionFormState => ({
  date: todayIso(),
  shift: 'mañana',
  batchCode: '',
  templateId,
  plannedUnits: '',
  actualUnits: '',
  technician: '',
  notes: '',
  status: 'hecho',
  changeReason: '',
  replacementMode: 'template',
  replacementTemplateId: templateId,
  replacementText: '',
})

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

const toDateOnly = (value: string) => new Date(`${value}T00:00:00`)

export default function Productions() {
  const [runs, setRuns] = useState<ProductionRun[]>([])
  const [templates, setTemplates] = useState<BatchTemplate[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [shiftFilter, setShiftFilter] = useState<'todas' | ProductionShift>(
    'todas',
  )
  const [form, setForm] = useState<ProductionFormState>(emptyForm())
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const dateInputRef = useRef<HTMLInputElement | null>(null)

  const loadData = async () => {
    const [runData, templateData, techData] = await Promise.all([
      listProductionRuns(),
      listBatchTemplates(),
      listTechnicians(),
    ])
    setRuns(runData)
    setTemplates(templateData)
    setTechnicians(techData)
    if (!form.templateId && templateData.length > 0) {
      setForm((prev) => ({
        ...prev,
        templateId: templateData[0].id,
        replacementTemplateId: prev.replacementTemplateId || templateData[0].id,
      }))
    }
    if (!form.technician && techData.length > 0) {
      setForm((prev) => ({ ...prev, technician: techData[0].initials }))
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRuns = useMemo(() => {
    const weekStart = startOfWeek(new Date(`${selectedDate}T00:00:00`))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    return runs
      .filter((run) => {
        const runDate = toDateOnly(run.date)
        const inWeek = runDate >= weekStart && runDate <= weekEnd
        const shiftMatch =
          shiftFilter === 'todas' ? true : run.shift === shiftFilter
        return inWeek && shiftMatch
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [runs, shiftFilter, selectedDate])

  const weekStats = useMemo(() => {
    const weekStart = startOfWeek(new Date(`${selectedDate}T00:00:00`))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const weeklyRuns = runs.filter((run) => {
      const runDate = toDateOnly(run.date)
      return runDate >= weekStart && runDate <= weekEnd
    })

    const byTechnician = weeklyRuns.reduce<Record<string, number>>(
      (acc, run) => {
        const key = run.technician || 'Sin técnico'
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      },
      {},
    )

    const byShift = weeklyRuns.reduce<Record<string, number>>(
      (acc, run) => {
        acc[run.shift] = (acc[run.shift] ?? 0) + 1
        return acc
      },
      {},
    )

    return {
      byTechnician: Object.entries(byTechnician).sort((a, b) => b[1] - a[1]),
      byShift: Object.entries(byShift).sort((a, b) => b[1] - a[1]),
    }
  }, [runs, selectedDate])

  const templateStats = useMemo(() => {
    const now = new Date()
    const monthAgo = new Date(now)
    monthAgo.setMonth(now.getMonth() - 1)

    const recentRuns = runs.filter((run) => {
      const runDate = toDateOnly(run.date)
      return runDate >= monthAgo && runDate <= now
    })

    const counts = recentRuns.reduce<Record<string, number>>((acc, run) => {
      acc[run.templateId] = (acc[run.templateId] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .map(([templateId, count]) => ({
        templateId,
        count,
        name: getTemplateName(templateId),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [runs, templates])

  const resetForm = () => {
    setForm(emptyForm(templates[0]?.id ?? ''))
    setError('')
    setShowForm(false)
  }

  const handleSave = async () => {
    const batchCode = form.batchCode.trim()
    const technician = form.technician.trim()
    const plannedUnits = Number(form.plannedUnits)
    const actualUnitsValue = form.actualUnits
      ? Number(form.actualUnits)
      : undefined
    const changeReason = form.changeReason.trim()
    const isChangeStatus = form.status === 'cambiado' || form.status === 'cancelado'

    if (!form.date) {
      setError('La fecha es obligatoria.')
      return
    }
    if (!/^[0-9]{9}$/.test(batchCode)) {
      setError('El código de lote debe tener exactamente 9 dígitos.')
      return
    }
    if (!form.templateId) {
      setError('Selecciona una plantilla.')
      return
    }
    if (Number.isNaN(plannedUnits) || plannedUnits <= 0) {
      setError('Las unidades planificadas deben ser mayores a 0.')
      return
    }
    if (
      actualUnitsValue !== undefined &&
      (Number.isNaN(actualUnitsValue) || actualUnitsValue < 0)
    ) {
      setError('Las unidades reales deben ser un número válido.')
      return
    }
    if (!technician) {
      setError('Selecciona un técnico.')
      return
    }
    if (isChangeStatus && !changeReason) {
      setError('Indica el motivo del cambio o cancelación.')
      return
    }
    if (form.status === 'cambiado') {
      if (
        form.replacementMode === 'template' &&
        !form.replacementTemplateId
      ) {
        setError('Selecciona la plantilla sustituta.')
        return
      }
      if (
        form.replacementMode === 'text' &&
        !form.replacementText.trim()
      ) {
        setError('Describe la sustitución.')
        return
      }
    }

    let changeLogUpdate: ChangeLogEntry[] | undefined
    if (isChangeStatus) {
      const replacementDetail =
        form.status === 'cambiado'
          ? form.replacementMode === 'template'
            ? `Sustituido por ${getTemplateName(form.replacementTemplateId)}`
            : `Sustituido por ${form.replacementText.trim()}`
          : undefined
      const detail = replacementDetail
        ? `${changeReason}. ${replacementDetail}`
        : changeReason
      const entry: ChangeLogEntry = {
        timestamp: new Date().toISOString(),
        type: form.status === 'cambiado' ? 'cambiado' : 'cancelado',
        detail,
      }
      if (form.id) {
        const existing = runs.find((run) => run.id === form.id)
        changeLogUpdate = [...(existing?.changeLog ?? []), entry]
      } else {
        changeLogUpdate = [entry]
      }
    }

    if (form.id) {
      await updateProductionRun(form.id, {
        date: form.date,
        shift: form.shift,
        batchCode,
        templateId: form.templateId,
        plannedUnits,
        actualUnits: actualUnitsValue,
        technician,
        notes: form.notes.trim() || undefined,
        status: form.status,
        ...(changeLogUpdate ? { changeLog: changeLogUpdate } : {}),
      })
    } else {
      await createProductionRun({
        date: form.date,
        shift: form.shift,
        batchCode,
        templateId: form.templateId,
        plannedUnits,
        actualUnits: actualUnitsValue,
        technician,
        notes: form.notes.trim() || undefined,
        status: form.status,
        changeLog: changeLogUpdate,
      })
    }

    await loadData()
    resetForm()
  }

  const handleEdit = (run: ProductionRun) => {
    setForm({
      id: run.id,
      date: run.date,
      shift: run.shift,
      batchCode: run.batchCode,
      templateId: run.templateId,
      plannedUnits: String(run.plannedUnits),
      actualUnits: run.actualUnits != null ? String(run.actualUnits) : '',
      technician: run.technician,
      notes: run.notes ?? '',
      status: run.status,
      changeReason: '',
      replacementMode: 'template',
      replacementTemplateId: templates[0]?.id ?? run.templateId,
      replacementText: '',
    })
    setError('')
    setShowForm(true)
  }

  const handleDelete = async (run: ProductionRun) => {
    const confirmed = window.confirm(
      `¿Eliminar producción ${run.batchCode}?`,
    )
    if (!confirmed) return
    await deleteProductionRun(run.id)
    await loadData()
    if (form.id === run.id) {
      resetForm()
    }
  }

  const getTemplateName = (id: string) =>
    templates.find((template) => template.id === id)?.name ?? 'Sin plantilla'

  return (
    <>
      <section className="card">
        <button
          className="primary-button"
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? 'Cerrar formulario' : 'Añadir producción'}
        </button>
      </section>

      {showForm ? (
        <section className="card">
          <h3>{form.id ? 'Editar producción' : 'Nueva producción'}</h3>
        <div className="form-grid">
          <div className="form-row">
            <label className="form-label" htmlFor="runDate">
              Fecha
            </label>
            <input
              id="runDate"
              className="form-input"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
            />
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="runShift">
              Turno
            </label>
            <select
              id="runShift"
              className="form-input"
              value={form.shift}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  shift: event.target.value as ProductionShift,
                }))
              }
            >
              <option value="mañana">Mañana</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="batchCode">
              Código de lote (9 dígitos)
            </label>
            <input
              id="batchCode"
              className="form-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={9}
              value={form.batchCode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  batchCode: event.target.value.replace(/\D/g, ''),
                }))
              }
              placeholder="000000000"
            />
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="templateId">
              Lote
            </label>
            <select
              id="templateId"
              className="form-input"
              value={form.templateId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, templateId: event.target.value }))
              }
            >
              {templates.length === 0 ? (
                <option value="">Sin lotes</option>
              ) : null}
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="plannedUnits">
              Unidades planificadas
            </label>
            <input
              id="plannedUnits"
              className="form-input"
              type="number"
              min={0}
              value={form.plannedUnits}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  plannedUnits: event.target.value,
                }))
              }
              placeholder="120"
            />
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="actualUnits">
              Unidades reales (opcional)
            </label>
            <input
              id="actualUnits"
              className="form-input"
              type="number"
              min={0}
              value={form.actualUnits}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  actualUnits: event.target.value,
                }))
              }
              placeholder="118"
            />
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="technician">
              Técnico
            </label>
            <select
              id="technician"
              className="form-input"
              value={form.technician}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  technician: event.target.value,
                }))
              }
            >
              {technicians.length === 0 ? (
                <option value="">Sin técnicos</option>
              ) : null}
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.initials}>
                  {tech.initials}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="status">
              Estado
            </label>
            <select
              id="status"
              className="form-input"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as ProductionStatus,
                }))
              }
            >
              <option value="hecho">Hecho</option>
              <option value="previsto">Previsto</option>
              <option value="cambiado">Cambiado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {form.status === 'cambiado' || form.status === 'cancelado' ? (
          <div className="form-row">
            <label className="form-label" htmlFor="changeReason">
              Motivo
            </label>
            <textarea
              id="changeReason"
              className="form-input form-textarea"
              rows={3}
              value={form.changeReason}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  changeReason: event.target.value,
                }))
              }
              placeholder="Motivo del cambio o cancelación"
            />
          </div>
        ) : null}

        {form.status === 'cambiado' ? (
          <div className="form-row">
            <label className="form-label">Sustitución</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-button${
                  form.replacementMode === 'template' ? ' active' : ''
                }`}
                onClick={() =>
                  setForm((prev) => ({ ...prev, replacementMode: 'template' }))
                }
              >
                Elegir plantilla
              </button>
              <button
                type="button"
                className={`toggle-button${
                  form.replacementMode === 'text' ? ' active' : ''
                }`}
                onClick={() =>
                  setForm((prev) => ({ ...prev, replacementMode: 'text' }))
                }
              >
                Escribir texto
              </button>
            </div>
            {form.replacementMode === 'template' ? (
              <select
                className="form-input"
                value={form.replacementTemplateId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    replacementTemplateId: event.target.value,
                  }))
                }
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="form-input"
                value={form.replacementText}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    replacementText: event.target.value,
                  }))
                }
                placeholder="Sustituido por otra producción"
              />
            )}
          </div>
        ) : null}

        <div className="form-row">
          <label className="form-label" htmlFor="notes">
            Notas
          </label>
          <textarea
            id="notes"
            className="form-input form-textarea"
            rows={3}
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Observaciones rápidas"
          />
        </div>

        {error ? <div className="form-error">{error}</div> : null}

          <div className="form-actions">
            <button className="primary-button" type="button" onClick={handleSave}>
              {form.id ? 'Guardar cambios' : 'Guardar producción'}
            </button>
            <button className="ghost-button" type="button" onClick={resetForm}>
              Cancelar
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h3>Semana actual</h3>
        <div className="form-grid">
          <div className="form-row">
            <label className="form-label" htmlFor="weekPicker">
              Elegir día
            </label>
            <div className="date-picker-row">
              <input
                ref={dateInputRef}
                id="weekPicker"
                className="form-input"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  dateInputRef.current?.showPicker
                    ? dateInputRef.current.showPicker()
                    : dateInputRef.current?.focus()
                }
              >
                Calendario
              </button>
            </div>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="shiftFilter">
              Turno
            </label>
            <select
              id="shiftFilter"
              className="form-input"
              value={shiftFilter}
              onChange={(event) =>
                setShiftFilter(event.target.value as 'todas' | ProductionShift)
              }
            >
              <option value="todas">Todas</option>
              <option value="mañana">Mañana</option>
              <option value="tarde">Tarde</option>
            </select>
          </div>
        </div>
        {filteredRuns.length === 0 ? (
          <p>No hay producciones para esta semana.</p>
        ) : (
          <div className="list">
            {filteredRuns.map((run) => (
              <article
                key={run.id}
                className={`list-item${
                  run.date === selectedDate ? ' is-highlighted' : ''
                }`}
              >
                <div className="list-item-main">
                  <div className="list-item-title">
                    {run.batchCode} · {getTemplateName(run.templateId)}
                  </div>
                  <div className="list-item-subtitle">
                    {run.date} · {run.shift} · {run.technician}
                  </div>
                  <div className="tag-row">
                    <span className={`status-badge status-${run.status}`}>
                      {run.status}
                    </span>
                    <span className="tag">Plan: {run.plannedUnits}</span>
                    {run.actualUnits != null ? (
                      <span className="tag">Real: {run.actualUnits}</span>
                    ) : null}
                  </div>
                  {run.changeLog && run.changeLog.length > 0 ? (
                    <div className="history">
                      Último cambio: {run.changeLog[run.changeLog.length - 1].detail}
                    </div>
                  ) : null}
                </div>
                <div className="list-item-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleEdit(run)}
                  >
                    Editar
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => handleDelete(run)}
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
        <h3>Estadísticas rápidas</h3>
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-title">Por técnico (semana)</div>
            {weekStats.byTechnician.length === 0 ? (
              <p>Sin datos.</p>
            ) : (
              <ul className="stats-list">
                {weekStats.byTechnician.map(([tech, count]) => (
                  <li key={tech}>
                    <span>{tech}</span>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="stats-card">
            <div className="stats-title">Por turno (semana)</div>
            {weekStats.byShift.length === 0 ? (
              <p>Sin datos.</p>
            ) : (
              <ul className="stats-list">
                {weekStats.byShift.map(([shift, count]) => (
                  <li key={shift}>
                    <span>{shift}</span>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="stats-card">
            <div className="stats-title">Plantillas frecuentes (30 días)</div>
            {templateStats.length === 0 ? (
              <p>Sin datos.</p>
            ) : (
              <ul className="stats-list">
                {templateStats.map((item) => (
                  <li key={item.templateId}>
                    <span>{item.name}</span>
                    <strong>{item.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
