export const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayLocalIso = () => toLocalDateKey(new Date())

export const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

export const getCalendarDays = (baseDate: Date) => {
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
