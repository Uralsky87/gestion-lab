import { useEffect, useMemo, useState } from 'react'
import type { NoteCategory, NoteEvent } from '../data/models'
import {
  createNoteEvent,
  deleteNoteEvent,
  listNoteEvents,
  updateNoteEvent,
} from '../data/repository'

type NotesFormState = {
  id?: string
  date: string
  title: string
  body: string
  category: NoteCategory
}

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

const emptyForm: NotesFormState = {
  date: todayIso(),
  title: '',
  body: '',
  category: 'propuesta',
}

const categories: NoteCategory[] = [
  'propuesta',
  'incidencia',
  'recordatorio',
  'otro',
]

export default function Notes() {
  const [notes, setNotes] = useState<NoteEvent[]>([])
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')
  const [categoryFilter, setCategoryFilter] = useState<'todas' | NoteCategory>(
    'todas',
  )
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [form, setForm] = useState<NotesFormState>(emptyForm)
  const [error, setError] = useState('')

  const loadNotes = async () => {
    const data = await listNoteEvents()
    setNotes(data)
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const filteredNotes = useMemo(() => {
    if (categoryFilter === 'todas') return notes
    return notes.filter((note) => note.category === categoryFilter)
  }, [notes, categoryFilter])

  const notesByDate = useMemo(() => {
    return filteredNotes.reduce<Record<string, NoteEvent[]>>((acc, note) => {
      acc[note.date] = acc[note.date] ? [...acc[note.date], note] : [note]
      return acc
    }, {})
  }, [filteredNotes])

  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth])

  const selectedNotes = useMemo(
    () => notesByDate[selectedDate] ?? [],
    [notesByDate, selectedDate],
  )

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

  const resetForm = () => {
    setForm(emptyForm)
    setError('')
  }

  const handleSave = async () => {
    const title = form.title.trim()
    if (!form.date) {
      setError('La fecha es obligatoria.')
      return
    }
    if (!title) {
      setError('El título es obligatorio.')
      return
    }

    if (form.id) {
      await updateNoteEvent(form.id, {
        date: form.date,
        title,
        body: form.body.trim() || undefined,
        category: form.category,
      })
    } else {
      await createNoteEvent({
        date: form.date,
        title,
        body: form.body.trim() || undefined,
        category: form.category,
      })
    }

    await loadNotes()
    resetForm()
  }

  const handleEdit = (note: NoteEvent) => {
    setForm({
      id: note.id,
      date: note.date,
      title: note.title,
      body: note.body ?? '',
      category: note.category,
    })
    setError('')
  }

  const handleDelete = async (note: NoteEvent) => {
    const confirmed = window.confirm(`¿Eliminar la nota "${note.title}"?`)
    if (!confirmed) return
    await deleteNoteEvent(note.id)
    await loadNotes()
    if (form.id === note.id) {
      resetForm()
    }
  }

  return (
    <>
      <section className="card">
        <div className="form-grid">
          <div className="form-row">
            <label className="form-label" htmlFor="notesView">
              Vista
            </label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-button${
                  viewMode === 'timeline' ? ' active' : ''
                }`}
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </button>
              <button
                type="button"
                className={`toggle-button${
                  viewMode === 'calendar' ? ' active' : ''
                }`}
                onClick={() => setViewMode('calendar')}
              >
                Calendario
              </button>
            </div>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="categoryFilter">
              Categoría
            </label>
            <select
              id="categoryFilter"
              className="form-input"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as 'todas' | NoteCategory)
              }
            >
              <option value="todas">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Crear nota</h3>
        <div className="form-grid">
          <div className="form-row">
            <label className="form-label" htmlFor="noteDate">
              Fecha
            </label>
            <input
              id="noteDate"
              className="form-input"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
            />
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="noteCategory">
              Categoría
            </label>
            <select
              id="noteCategory"
              className="form-input"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  category: event.target.value as NoteCategory,
                }))
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="noteTitle">
              Título
            </label>
            <input
              id="noteTitle"
              className="form-input"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Ej: Falla en horno"
            />
          </div>
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor="noteBody">
            Descripción
          </label>
          <textarea
            id="noteBody"
            className="form-input form-textarea"
            rows={3}
            value={form.body}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, body: event.target.value }))
            }
            placeholder="Detalles adicionales"
          />
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        <div className="form-actions">
          <button className="primary-button" type="button" onClick={handleSave}>
            {form.id ? 'Guardar cambios' : 'Guardar nota'}
          </button>
          {form.id ? (
            <button className="ghost-button" type="button" onClick={resetForm}>
              Cancelar edición
            </button>
          ) : null}
        </div>
      </section>

      <section className="card">
        <h3>Notas</h3>
        {filteredNotes.length === 0 ? (
          <p>No hay notas registradas.</p>
        ) : viewMode === 'timeline' ? (
          <div className="timeline">
            {Object.entries(notesByDate).map(([date, entries]) => (
              <div key={date} className="timeline-group">
                <div className="timeline-date">{date}</div>
                <div className="list">
                  {entries.map((note) => (
                    <article key={note.id} className="list-item">
                      <div className="list-item-main">
                        <div className="list-item-title">{note.title}</div>
                        {note.body ? (
                          <div className="list-item-subtitle">{note.body}</div>
                        ) : null}
                        <span className={`note-badge note-${note.category}`}>
                          {note.category}
                        </span>
                      </div>
                      <div className="list-item-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleEdit(note)}
                        >
                          Editar
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => handleDelete(note)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="calendar-notes">
            <div className="calendar-header">
              <button
                className="ghost-button"
                type="button"
                onClick={handlePrevMonth}
              >
                ◀
              </button>
              <div className="calendar-title">{getMonthLabel(currentMonth)}</div>
              <button
                className="ghost-button"
                type="button"
                onClick={handleNextMonth}
              >
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
                const dayNotes = notesByDate[dateKey] ?? []
                const isSelected = selectedDate === dateKey

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`calendar-day${
                      isCurrentMonth ? '' : ' is-muted'
                    }${dayNotes.length > 0 ? ' is-highlighted' : ''}${
                      isSelected ? ' is-selected' : ''
                    }`}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span className="calendar-day-number">{day.getDate()}</span>
                    <div className="calendar-chips">
                      {dayNotes.slice(0, 3).map((note) => (
                        <span key={note.id} className="calendar-chip">
                          {note.title}
                        </span>
                      ))}
                      {dayNotes.length > 3 ? (
                        <span className="calendar-chip more">
                          +{dayNotes.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="calendar-note-detail">
              <div className="timeline-date">Detalle · {selectedDate}</div>
              {selectedNotes.length === 0 ? (
                <p>No hay notas para este día.</p>
              ) : (
                <div className="list">
                  {selectedNotes.map((note) => (
                    <article key={note.id} className="list-item">
                      <div className="list-item-main">
                        <div className="list-item-title">{note.title}</div>
                        {note.body ? (
                          <div className="list-item-subtitle">{note.body}</div>
                        ) : null}
                        <span className={`note-badge note-${note.category}`}>
                          {note.category}
                        </span>
                      </div>
                      <div className="list-item-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleEdit(note)}
                        >
                          Editar
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => handleDelete(note)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
