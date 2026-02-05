import { useEffect, useMemo, useState } from 'react'
import type { BatchTemplate, ProductionRun } from '../data/models'
import { listBatchTemplates, listProductionRuns } from '../data/repository'

const todayIso = () => new Date().toISOString().slice(0, 10)

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

const getCalendarDays = (baseDate: Date) => {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const weekDayIndex = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - weekDayIndex)
  const days: Date[] = []

  for (let i = 0; i < 42; i += 1) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    days.push(day)
  }

  return days
}

export default function Calendar() {
  const [runs, setRuns] = useState<ProductionRun[]>([])
  const [templates, setTemplates] = useState<BatchTemplate[]>([])
  const [search, setSearch] = useState('')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(todayIso())

  useEffect(() => {
    const loadData = async () => {
      const [runData, templateData] = await Promise.all([
        listProductionRuns(),
        listBatchTemplates(),
      ])
      setRuns(runData)
      setTemplates(templateData)
    }

    loadData()
  }, [])

  const templateMap = useMemo(() => {
    return new Map(templates.map((template) => [template.id, template.name]))
  }, [templates])

  const getTemplateName = (id: string) => templateMap.get(id) ?? 'Sin plantilla'

  const runsByDate = useMemo(() => {
    return runs.reduce<Record<string, ProductionRun[]>>((acc, run) => {
      acc[run.date] = acc[run.date] ? [...acc[run.date], run] : [run]
      return acc
    }, {})
  }, [runs])

  const searchMatches = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return runs
    return runs.filter((run) => {
      const templateName = getTemplateName(run.templateId).toLowerCase()
      const technician = run.technician.toLowerCase()
      const batchCode = run.batchCode.toLowerCase()
      return (
        templateName.includes(query) ||
        technician.includes(query) ||
        batchCode.includes(query)
      )
    })
  }, [search, runs, templateMap])

  const matchedDates = useMemo(() => {
    const dates = new Set<string>()
    searchMatches.forEach((run) => dates.add(run.date))
    return dates
  }, [searchMatches])

  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth])

  const selectedRuns = useMemo(() => {
    const dayRuns = runsByDate[selectedDate] ?? []
    if (!search.trim()) return dayRuns
    const matchIds = new Set(searchMatches.map((run) => run.id))
    return dayRuns.filter((run) => matchIds.has(run.id))
  }, [runsByDate, selectedDate, search, searchMatches])

  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    )
  }

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    )
  }

  return (
    <>
      <h2 className="page-title">Calendario</h2>

      <section className="card">
        <div className="form-row">
          <label className="form-label" htmlFor="calendarSearch">
            Buscar
          </label>
          <input
            id="calendarSearch"
            className="form-input"
            type="search"
            placeholder="Plantilla, técnico o batchCode"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </section>

      <section className="card">
        <div className="calendar-header">
          <button className="ghost-button" type="button" onClick={handlePrevMonth}>
            ◀
          </button>
          <div className="calendar-title">{getMonthLabel(currentMonth)}</div>
          <button className="ghost-button" type="button" onClick={handleNextMonth}>
            ▶
          </button>
        </div>
        <div className="calendar-weekdays">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const dateKey = day.toISOString().slice(0, 10)
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const dayRuns = runsByDate[dateKey] ?? []
            const filteredDayRuns = search.trim()
              ? dayRuns.filter((run) =>
                  searchMatches.some((match) => match.id === run.id),
                )
              : dayRuns
            const hasMatch = search.trim() ? matchedDates.has(dateKey) : false
            const isSelected = selectedDate === dateKey

            return (
              <button
                key={dateKey}
                type="button"
                className={`calendar-day${
                  isCurrentMonth ? '' : ' is-muted'
                }${hasMatch ? ' is-highlighted' : ''}${
                  isSelected ? ' is-selected' : ''
                }`}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span className="calendar-day-number">{day.getDate()}</span>
                <div className="calendar-chips">
                  {filteredDayRuns.slice(0, 3).map((run) => (
                    <span key={run.id} className="calendar-chip">
                      {getTemplateName(run.templateId)} · {run.shift}
                    </span>
                  ))}
                  {filteredDayRuns.length > 3 ? (
                    <span className="calendar-chip more">
                      +{filteredDayRuns.length - 3}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h3>Detalle del día</h3>
        {selectedRuns.length === 0 ? (
          <p>No hay producciones para este día.</p>
        ) : (
          <div className="list">
            {selectedRuns.map((run) => (
              <article key={run.id} className="list-item">
                <div className="list-item-main">
                  <div className="list-item-title">
                    {getTemplateName(run.templateId)} · {run.shift}
                  </div>
                  <div className="list-item-subtitle">
                    {run.batchCode} · {run.technician}
                  </div>
                </div>
                <div className="list-item-actions">
                  <span className={`status-badge status-${run.status}`}>
                    {run.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {search.trim() && searchMatches.length > 0 ? (
        <section className="card">
          <h3>Resultados</h3>
          <div className="list">
            {searchMatches.map((run) => (
              <button
                key={run.id}
                type="button"
                className="list-item list-item-button"
                onClick={() => setSelectedDate(run.date)}
              >
                <div className="list-item-main">
                  <div className="list-item-title">
                    {run.date} · {getTemplateName(run.templateId)}
                  </div>
                  <div className="list-item-subtitle">
                    {run.shift} · {run.technician} · {run.batchCode}
                  </div>
                </div>
                <span className={`status-badge status-${run.status}`}>
                  {run.status}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
