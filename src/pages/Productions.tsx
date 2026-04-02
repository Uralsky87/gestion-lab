import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type {
  BatchTemplate,
  NewProductionRun,
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
import { todayLocalIso } from '../utils/date'

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
  incidents: string
  status: ProductionStatus
  changeReason: string
}

const emptyForm = (templateId = ''): ProductionFormState => ({
  date: todayLocalIso(),
  shift: 'mañana',
  batchCode: '',
  templateId,
  plannedUnits: '',
  actualUnits: '',
  technician: '',
  notes: '',
  incidents: '',
  status: 'previsto',
  changeReason: '',
})

type RunDetailKind = 'notes' | 'incidents'

type RunDetailDialog = {
  title: string
  content: string[]
  kind: RunDetailKind
}

type ProductionConflictDialog = {
  existingRun: ProductionRun
  replacementData: NewProductionRun
}

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

const toDateOnly = (value: string) => new Date(`${value}T00:00:00`)

const sortTemplatesByName = (a: BatchTemplate, b: BatchTemplate) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

export default function Productions() {
  const location = useLocation()
  const navigate = useNavigate()
  const [runs, setRuns] = useState<ProductionRun[]>([])
  const [templates, setTemplates] = useState<BatchTemplate[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [shiftFilter, setShiftFilter] = useState<Record<ProductionShift, boolean>>({
    mañana: true,
    tarde: true,
  })
  const [form, setForm] = useState<ProductionFormState>(emptyForm())
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayLocalIso())
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const formRef = useRef<HTMLElement | null>(null)
  const [isTotalStatsOpen, setIsTotalStatsOpen] = useState(false)
  const [noteDialog, setNoteDialog] = useState<RunDetailDialog | null>(null)
  const [quickStatusRunId, setQuickStatusRunId] = useState<string | null>(null)
  const [conflictDialog, setConflictDialog] =
    useState<ProductionConflictDialog | null>(null)

  const loadData = async () => {
    const [runData, templateData, techData] = await Promise.all([
      listProductionRuns(),
      listBatchTemplates(),
      listTechnicians(),
    ])
    const sortedTemplates = [...templateData].sort(sortTemplatesByName)
    setRuns(runData)
    setTemplates(sortedTemplates)
    setTechnicians(techData)
    if (!form.templateId && sortedTemplates.length > 0) {
      setForm((prev) => ({
        ...prev,
        templateId: sortedTemplates[0].id,
      }))
    }
    if (!form.technician && techData.length > 0) {
      setForm((prev) => ({ ...prev, technician: techData[0].initials }))
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const nextSelectedDate = (location.state as { selectedDate?: string } | null)
      ?.selectedDate
    if (!nextSelectedDate) return

    setSelectedDate(nextSelectedDate)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!showForm) return
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showForm])

  const getTemplateName = (id: string) =>
    templates.find((template) => template.id === id)?.name ?? 'Sin plantilla'

  const hasRunNotes = (run: ProductionRun) => Boolean(run.notes?.trim())

  const hasRunIncidents = (run: ProductionRun) => Boolean(run.incidents?.trim())

  const openRunDetail = (run: ProductionRun, kind: RunDetailKind) => {
    const content = kind === 'incidents' ? run.incidents?.trim() : run.notes?.trim()
    if (!content) return
    setNoteDialog({
      title: `${run.batchCode} · ${getTemplateName(run.templateId)}`,
      content: [content],
      kind,
    })
  }

  const filteredRuns = useMemo(() => {
    const weekStart = startOfWeek(new Date(`${selectedDate}T00:00:00`))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    return runs
      .filter((run) => {
        const runDate = toDateOnly(run.date)
        const inWeek = runDate >= weekStart && runDate <= weekEnd
        const shiftMatch = shiftFilter[run.shift]
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

  const totalStats = useMemo(() => {
    const byTechnician = runs.reduce<Record<string, number>>((acc, run) => {
      const key = run.technician || 'Sin técnico'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    const byShift = runs.reduce<Record<string, number>>((acc, run) => {
      acc[run.shift] = (acc[run.shift] ?? 0) + 1
      return acc
    }, {})

    const templateCounts = runs.reduce<Record<string, number>>((acc, run) => {
      acc[run.templateId] = (acc[run.templateId] ?? 0) + 1
      return acc
    }, {})

    const templatesRanking = templates
      .map((template) => ({
        templateId: template.id,
        count: templateCounts[template.id] ?? 0,
        name: template.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

    return {
      byTechnician: Object.entries(byTechnician).sort((a, b) => b[1] - a[1]),
      byShift: Object.entries(byShift).sort((a, b) => b[1] - a[1]),
      templates: templatesRanking,
    }
  }, [runs, templates])

  const resetForm = () => {
    setForm(emptyForm(templates[0]?.id ?? ''))
    setError('')
    setShowForm(false)
    setConflictDialog(null)
  }

  const persistProduction = async (
    data: NewProductionRun,
    options?: { replaceRunId?: string },
  ) => {
    if (options?.replaceRunId) {
      await updateProductionRun(options.replaceRunId, data)
    } else {
      await createProductionRun(data)
    }

    await loadData()
    resetForm()
  }

  const handleSave = async () => {
    const batchCode = form.batchCode.trim()
    const technician = form.technician.trim()
    const plannedUnits = Number(form.plannedUnits)
    const actualUnitsValue = form.actualUnits
      ? Number(form.actualUnits)
      : undefined
    const changeReason = form.changeReason.trim()
    const isCancelled = form.status === 'cancelado'

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
    if (isCancelled && !changeReason) {
      setError('Indica el motivo de la anulación.')
      return
    }

    const changeLogUpdate = isCancelled
      ? [
          ...((runs.find((run) => run.id === form.id)?.changeLog ?? []).filter(
            Boolean,
          )),
          {
            timestamp: new Date().toISOString(),
            type: 'cancelado' as const,
            detail: changeReason,
          },
        ]
      : undefined

    const productionData: NewProductionRun = {
      date: form.date,
      shift: form.shift,
      batchCode,
      templateId: form.templateId,
      plannedUnits,
      actualUnits: actualUnitsValue,
      technician,
      notes: form.notes.trim() || undefined,
      incidents: form.incidents.trim() || undefined,
      status: form.status,
      changeLog: changeLogUpdate,
    }

    if (!form.id) {
      const conflictingRun = runs.find(
        (run) => run.date === form.date && run.shift === form.shift,
      )

      if (conflictingRun) {
        setConflictDialog({
          existingRun: conflictingRun,
          replacementData: productionData,
        })
        return
      }
    }

    if (form.id) {
      await updateProductionRun(form.id, {
        ...productionData,
      })
      await loadData()
      resetForm()
    } else {
      await persistProduction(productionData)
    }
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
      incidents: run.incidents ?? '',
      status: run.status === 'cambiado' ? 'previsto' : run.status,
      changeReason: '',
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

  const handleQuickStatusChange = async (
    run: ProductionRun,
    nextStatus: 'previsto' | 'hecho' | 'cancelado',
  ) => {
    if (run.status === nextStatus) return

    setQuickStatusRunId(run.id)
    try {
      await updateProductionRun(run.id, { status: nextStatus })
      await loadData()
      if (form.id === run.id) {
        setForm((prev) => ({ ...prev, status: nextStatus }))
      }
    } finally {
      setQuickStatusRunId(null)
    }
  }

  const toggleShiftFilter = (shift: ProductionShift) => {
    setShiftFilter((prev) => ({
      ...prev,
      [shift]: !prev[shift],
    }))
  }

  const handleConfirmConflictSwap = async () => {
    if (!conflictDialog) return

    await persistProduction(conflictDialog.replacementData, {
      replaceRunId: conflictDialog.existingRun.id,
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
          {showForm ? 'Cerrar formulario' : 'Añadir producción'}
        </button>
      </section>

      {showForm ? (
        <section className="card" ref={formRef}>
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
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {form.status === 'cancelado' ? (
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
              placeholder="Motivo de la anulación"
            />
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

        <div className="form-row">
          <label className="form-label" htmlFor="incidents">
            Incidentes
          </label>
          <textarea
            id="incidents"
            className="form-input form-textarea"
            rows={3}
            value={form.incidents}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, incidents: event.target.value }))
            }
            placeholder="Incidencias de la producción"
          />
        </div>

        {error ? <div className="form-error">{error}</div> : null}

          <div className="form-actions">
            <button className="primary-button" type="button" onClick={handleSave}>
              {form.id ? 'Guardar cambios' : 'Guardar producción'}
            </button>
            {form.id ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  const currentRun = runs.find((run) => run.id === form.id)
                  if (currentRun) {
                    void handleDelete(currentRun)
                  }
                }}
              >
                Eliminar
              </button>
            ) : null}
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
            <label className="form-label">
              Turno
            </label>
            <div className="toggle-row shift-filter-row">
              <label className="quick-status-option">
                <input
                  type="checkbox"
                  checked={shiftFilter.mañana}
                  onChange={() => toggleShiftFilter('mañana')}
                />
                <span>Mañana</span>
              </label>
              <label className="quick-status-option">
                <input
                  type="checkbox"
                  checked={shiftFilter.tarde}
                  onChange={() => toggleShiftFilter('tarde')}
                />
                <span>Tarde</span>
              </label>
            </div>
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
                    {hasRunIncidents(run) ? (
                      <button
                        className="note-alert note-alert-incident"
                        type="button"
                        onClick={() => openRunDetail(run, 'incidents')}
                        aria-label="Ver incidentes"
                        title="Ver incidentes"
                      >
                        !
                      </button>
                    ) : null}
                    {hasRunNotes(run) ? (
                      <button
                        className="note-alert note-alert-note"
                        type="button"
                        onClick={() => openRunDetail(run, 'notes')}
                        aria-label="Ver notas"
                        title="Ver notas"
                      >
                        !
                      </button>
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
                  <div className="quick-status-group" aria-label="Estado rápido">
                    <label className="quick-status-option quick-status-option-done">
                      <input
                        type="checkbox"
                        checked={run.status === 'hecho'}
                        disabled={quickStatusRunId === run.id}
                        onChange={(event) =>
                          void handleQuickStatusChange(
                            run,
                            event.target.checked ? 'hecho' : 'previsto',
                          )
                        }
                      />
                      <span>Hecho</span>
                    </label>
                    <label className="quick-status-option quick-status-option-cancelled">
                      <input
                        type="checkbox"
                        checked={run.status === 'cancelado'}
                        disabled={quickStatusRunId === run.id}
                        onChange={(event) =>
                          void handleQuickStatusChange(
                            run,
                            event.target.checked ? 'cancelado' : 'previsto',
                          )
                        }
                      />
                      <span>Anulado</span>
                    </label>
                  </div>
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

      <section className="card">
        <div className="card-header">
          <h3>Estadísticas totales</h3>
          <div className="card-header-actions">
            <button
              className="ghost-button small-button"
              type="button"
              onClick={() => setIsTotalStatsOpen((prev) => !prev)}
              aria-expanded={isTotalStatsOpen}
              aria-controls="total-stats"
            >
              {isTotalStatsOpen ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
        {isTotalStatsOpen ? (
          <div id="total-stats" className="stats-grid">
            <div className="stats-card">
              <div className="stats-title">Por técnico (total)</div>
              {totalStats.byTechnician.length === 0 ? (
                <p>Sin datos.</p>
              ) : (
                <ul className="stats-list">
                  {totalStats.byTechnician.map(([tech, count]) => (
                    <li key={tech}>
                      <span>{tech}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="stats-card">
              <div className="stats-title">Por turno (total)</div>
              {totalStats.byShift.length === 0 ? (
                <p>Sin datos.</p>
              ) : (
                <ul className="stats-list">
                  {totalStats.byShift.map(([shift, count]) => (
                    <li key={shift}>
                      <span>{shift}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="stats-card">
              <div className="stats-title">Plantillas (total)</div>
              {totalStats.templates.length === 0 ? (
                <p>Sin datos.</p>
              ) : (
                <ul className="stats-list">
                  {totalStats.templates.map((item) => (
                    <li key={item.templateId}>
                      <span>{item.name}</span>
                      <strong>{item.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {noteDialog ? (
        <div
          className="note-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setNoteDialog(null)}
        >
          <div
            className="note-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="note-modal-header">
              <h4>
                {noteDialog.kind === 'incidents' ? 'Incidentes' : 'Notas'} ·{' '}
                {noteDialog.title}
              </h4>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setNoteDialog(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="note-modal-body">
              {noteDialog.content.map((note, index) => (
                <p className="note-text" key={`${note}-${index}`}>
                  {note}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {conflictDialog ? (
        <div
          className="note-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setConflictDialog(null)}
        >
          <div
            className="note-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="note-modal-header">
              <h4>Ya existe una producción en ese día y turno</h4>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setConflictDialog(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="note-modal-body">
              <p className="note-text">
                {conflictDialog.existingRun.date} · {conflictDialog.existingRun.shift}
              </p>
              <p className="note-text">
                Lote actual: {getTemplateName(conflictDialog.existingRun.templateId)}
              </p>
              <p className="note-text">
                Código: {conflictDialog.existingRun.batchCode} · Técnico:{' '}
                {conflictDialog.existingRun.technician}
              </p>
              <p className="note-text">
                Estado: {conflictDialog.existingRun.status}
              </p>
            </div>
            <div className="form-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setConflictDialog(null)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void handleConfirmConflictSwap()}
              >
                Intercambiar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
