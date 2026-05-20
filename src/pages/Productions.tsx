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
  createBatchTemplate,
  createProductionRun,
  deleteProductionRun,
  listBatchTemplates,
  listProductionRuns,
  listTechnicians,
  updateProductionRun,
} from '../data/repository'
import {
  getCalendarDays,
  getMonthLabel,
  todayLocalIso,
  toLocalDateKey,
} from '../utils/date'

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
  status: 'planificada',
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

type ProductionFormMode = 'create' | 'replace'

type ProductionViewMode = 'day' | 'calendar'

const shifts: ProductionShift[] = ['mañana', 'tarde']

const statusLabels: Record<ProductionStatus, string> = {
  planificada: 'Planificada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const getVisibleStatus = (status: ProductionStatus) => status

const toDateOnly = (value: string) => new Date(`${value}T00:00:00`)

const addDays = (value: string, amount: number) => {
  const date = toDateOnly(value)
  date.setDate(date.getDate() + amount)
  return toLocalDateKey(date)
}

const getDayLabel = (value: string) =>
  toDateOnly(value).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

const sortTemplatesByName = (a: BatchTemplate, b: BatchTemplate) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

export default function Productions() {
  const location = useLocation()
  const navigate = useNavigate()
  const [runs, setRuns] = useState<ProductionRun[]>([])
  const [templates, setTemplates] = useState<BatchTemplate[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [form, setForm] = useState<ProductionFormState>(emptyForm())
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<ProductionFormMode>('create')
  const [viewMode, setViewMode] = useState<ProductionViewMode>('day')
  const [selectedDate, setSelectedDate] = useState(todayLocalIso())
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const formRef = useRef<HTMLElement | null>(null)
  const [isTotalStatsOpen, setIsTotalStatsOpen] = useState(false)
  const [noteDialog, setNoteDialog] = useState<RunDetailDialog | null>(null)
  const [quickStatusRunId, setQuickStatusRunId] = useState<string | null>(null)
  const [quickTemplateName, setQuickTemplateName] = useState('')
  const [quickTemplateError, setQuickTemplateError] = useState('')
  const [isQuickTemplateOpen, setIsQuickTemplateOpen] = useState(false)
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
    const nextDate = toDateOnly(nextSelectedDate)
    setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
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

  const selectedDayRuns = useMemo(() => {
    return runs
      .filter((run) => run.date === selectedDate)
      .sort((a, b) => shifts.indexOf(a.shift) - shifts.indexOf(b.shift))
  }, [runs, selectedDate])

  const runsByDate = useMemo(() => {
    return runs.reduce<Record<string, ProductionRun[]>>((acc, run) => {
      acc[run.date] = acc[run.date] ? [...acc[run.date], run] : [run]
      return acc
    }, {})
  }, [runs])

  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth],
  )

  const getRunByShift = (shift: ProductionShift) =>
    selectedDayRuns.find((run) => run.shift === shift)

  const openRunDetail = (run: ProductionRun, kind: RunDetailKind) => {
    const content = kind === 'incidents' ? run.incidents?.trim() : run.notes?.trim()
    if (!content) return
    setNoteDialog({
      title: `${run.batchCode} · ${getTemplateName(run.templateId)}`,
      content: [content],
      kind,
    })
  }

  const weekStats = useMemo(() => {
    const weekStart = new Date(`${selectedDate}T00:00:00`)
    const day = weekStart.getDay()
    const diff = day === 0 ? -6 : 1 - day
    weekStart.setDate(weekStart.getDate() + diff)
    weekStart.setHours(0, 0, 0, 0)
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
    setFormMode('create')
    setError('')
    setShowForm(false)
    setConflictDialog(null)
  }

  const buildDefaultForm = (
    shift: ProductionShift,
    date = selectedDate,
  ): ProductionFormState => ({
    ...emptyForm(templates[0]?.id ?? ''),
    date,
    shift,
    technician: technicians[0]?.initials ?? '',
  })

  const describeRun = (run: ProductionRun) => {
    const templateName = getTemplateName(run.templateId)
    const statusLabel = statusLabels[getVisibleStatus(run.status)]
    return `${run.batchCode} - ${templateName} - ${run.technician} - ${statusLabel}`
  }

  const handleCreateInSlot = (shift: ProductionShift) => {
    setForm(buildDefaultForm(shift))
    setFormMode('create')
    setError('')
    setShowForm(true)
  }

  const handlePrevDay = () => {
    const nextDate = addDays(selectedDate, -1)
    const nextMonth = toDateOnly(nextDate)
    setSelectedDate(nextDate)
    setCalendarMonth(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
  }

  const handleNextDay = () => {
    const nextDate = addDays(selectedDate, 1)
    const nextMonth = toDateOnly(nextDate)
    setSelectedDate(nextDate)
    setCalendarMonth(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
  }

  const handleSelectCalendarDay = (dateKey: string) => {
    setSelectedDate(dateKey)
    setViewMode('day')
  }

  const handleCreateQuickTemplate = async () => {
    const name = quickTemplateName.trim()
    if (!name) {
      setQuickTemplateError('El nombre es obligatorio.')
      return
    }

    const createdTemplate = await createBatchTemplate({
      name,
      materials: [],
    })
    const nextTemplates = [...templates, createdTemplate].sort(sortTemplatesByName)
    setTemplates(nextTemplates)
    setForm((prev) => ({ ...prev, templateId: createdTemplate.id }))
    setQuickTemplateName('')
    setQuickTemplateError('')
    setIsQuickTemplateOpen(false)
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
    setSelectedDate(data.date)
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
    const isCancelled = form.status === 'cancelada'

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

    if (formMode === 'replace' && !changeReason) {
      setError('Indica el motivo del cambio.')
      return
    }

    const currentRun = runs.find((run) => run.id === form.id)
    const existingChangeLog = (currentRun?.changeLog ?? []).filter(Boolean)

    const changeLogUpdate = formMode === 'replace' && currentRun
      ? [
          ...existingChangeLog,
          {
            timestamp: new Date().toISOString(),
            type: 'cambiado' as const,
            detail: `Anterior: ${describeRun(currentRun)}. Motivo: ${changeReason}`,
          },
        ]
      : isCancelled
      ? [
          ...existingChangeLog,
          {
            timestamp: new Date().toISOString(),
            type: 'cancelada' as const,
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
        changeLog: changeLogUpdate ?? currentRun?.changeLog,
      })
      await loadData()
      setSelectedDate(form.date)
      resetForm()
    } else {
      await persistProduction(productionData)
    }
  }

  const handleReplace = (run: ProductionRun) => {
    setForm({
      ...buildDefaultForm(run.shift, run.date),
      id: run.id,
    })
    setFormMode('replace')
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
    nextStatus: 'planificada' | 'completada' | 'cancelada',
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

  const handleConfirmConflictSwap = async () => {
    if (!conflictDialog) return

    await persistProduction(conflictDialog.replacementData, {
      replaceRunId: conflictDialog.existingRun.id,
    })
  }

  return (
    <>
      <section className="card production-day-card">
        <div className="production-day-header">
          <button
            className="ghost-button date-nav-button"
            type="button"
            onClick={handlePrevDay}
            aria-label="Dia anterior"
          >
            {'<'}
          </button>
          <div className="production-day-title">
            <span>{getDayLabel(selectedDate)}</span>
          </div>
          <button
            className="ghost-button date-nav-button"
            type="button"
            onClick={handleNextDay}
            aria-label="Dia siguiente"
          >
            {'>'}
          </button>
        </div>

        <div className="production-view-toggle">
          <button
            className={`toggle-button${viewMode === 'day' ? ' active' : ''}`}
            type="button"
            onClick={() => setViewMode('day')}
          >
            Dia
          </button>
          <button
            className={`toggle-button${viewMode === 'calendar' ? ' active' : ''}`}
            type="button"
            onClick={() => setViewMode('calendar')}
          >
            Calendario
          </button>
        </div>

        {viewMode === 'calendar' ? (
          <div className="production-calendar">
            <div className="calendar-header">
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                {'<'}
              </button>
              <div className="calendar-title">{getMonthLabel(calendarMonth)}</div>
              <button
                className="ghost-button"
                type="button"
                onClick={() =>
                  setCalendarMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                {'>'}
              </button>
            </div>
            <div className="calendar-weekdays">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mie</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sab</span>
              <span>Dom</span>
            </div>
            <div className="calendar-grid">
              {calendarDays.map((day) => {
                const dateKey = toLocalDateKey(day)
                const dayRuns = runsByDate[dateKey] ?? []
                const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                const isSelected = selectedDate === dateKey

                return (
                  <button
                    key={dateKey}
                    className={`calendar-day${
                      isCurrentMonth ? '' : ' is-muted'
                    }${isSelected ? ' is-selected' : ''}`}
                    type="button"
                    onClick={() => handleSelectCalendarDay(dateKey)}
                  >
                    <span className="calendar-day-number">{day.getDate()}</span>
                    <div className="calendar-dots">
                      {shifts.map((shift) => {
                        const run = dayRuns.find((item) => item.shift === shift)
                        const status = run
                          ? getVisibleStatus(run.status)
                          : 'empty'
                        return (
                          <div className="calendar-shift-row" key={shift}>
                            <span className={`calendar-dot status-${status}`} />
                          </div>
                        )
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="production-slots">
            {shifts.map((shift) => {
              const run = getRunByShift(shift)
              const statusValue = run ? getVisibleStatus(run.status) : undefined

              return (
                <article
                  className={`production-slot${run ? ' has-run' : ' is-empty'}`}
                  key={shift}
                >
                  <div className="production-slot-header">
                    <div>
                      <h3>{shift === 'mañana' ? 'Mañana' : 'Tarde'}</h3>
                      <p>{run ? getTemplateName(run.templateId) : 'Sin producción'}</p>
                    </div>
                    {run ? (
                      <span className={`status-badge status-${run.status}`}>
                        {statusValue ? statusLabels[statusValue] : run.status}
                      </span>
                    ) : null}
                  </div>

                  {run ? (
                    <>
                      <div className="production-slot-body">
                        <div className="list-item-title">{run.batchCode}</div>
                        <div className="list-item-subtitle">
                          {run.technician} - Plan: {run.plannedUnits}
                          {run.actualUnits != null ? ` - Real: ${run.actualUnits}` : ''}
                        </div>
                        <div className="tag-row">
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
                            {run.changeLog.map((entry, index) => (
                              <div key={`${entry.timestamp}-${index}`}>
                                {entry.detail}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="slot-status-row">
                        {(['planificada', 'completada', 'cancelada'] as const).map(
                          (status) => (
                            <button
                              className={`toggle-button${
                                statusValue === status ? ' active' : ''
                              }`}
                              type="button"
                              disabled={quickStatusRunId === run.id}
                              onClick={() =>
                                void handleQuickStatusChange(run, status)
                              }
                              key={status}
                            >
                              {statusLabels[status]}
                            </button>
                          ),
                        )}
                      </div>
                      <div className="production-slot-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleReplace(run)}
                        >
                          Cambiar
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => void handleDelete(run)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="add-slot-button"
                      type="button"
                      onClick={() => handleCreateInSlot(shift)}
                      aria-label={`Crear producción de ${shift}`}
                    >
                      +
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {showForm ? (
        <section className="card" ref={formRef}>
          <h3>{form.id ? 'Editar producción' : 'Nueva producción'}</h3>
          {formMode === 'replace' ? (
            <p>Rellena la nueva producción y guarda el motivo del cambio.</p>
          ) : null}
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
            <div className="template-select-row">
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
              <button
                className="secondary-button quick-template-button"
                type="button"
                onClick={() => {
                  setQuickTemplateError('')
                  setIsQuickTemplateOpen(true)
                }}
                aria-label="Crear lote"
                title="Crear lote"
              >
                +
              </button>
            </div>
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
              <option value="planificada">Planificada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {form.status === 'cancelada' || formMode === 'replace' ? (
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

      {isQuickTemplateOpen ? (
        <div
          className="note-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsQuickTemplateOpen(false)}
        >
          <div
            className="note-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="note-modal-header">
              <h4>Crear lote</h4>
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsQuickTemplateOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="quickTemplateName">
                Nombre
              </label>
              <input
                id="quickTemplateName"
                className="form-input"
                value={quickTemplateName}
                onChange={(event) => {
                  setQuickTemplateName(event.target.value)
                  setQuickTemplateError('')
                }}
                placeholder="Nombre del lote"
                autoFocus
              />
            </div>
            {quickTemplateError ? (
              <div className="form-error">{quickTemplateError}</div>
            ) : null}
            <div className="form-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setIsQuickTemplateOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => void handleCreateQuickTemplate()}
              >
                Crear y seleccionar
              </button>
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

