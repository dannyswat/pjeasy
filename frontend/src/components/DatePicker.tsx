import { useEffect, useMemo, useRef, useState } from 'react'

interface DatePickerProps {
  id?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseDateValue(value?: string) {
  if (!value) return null

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function buildCalendarDays(visibleMonth: Date) {
  const startOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const endOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0)
  const daysInMonth = endOfMonth.getDate()
  const leadingEmptyDays = startOfMonth.getDay()
  const cells: Array<Date | null> = []

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day))
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return cells
}

export default function DatePicker({
  id,
  value = '',
  onChange,
  placeholder = 'Select date',
  className = '',
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selectedDate = parseDateValue(value)
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date())

  useEffect(() => {
    if (!selectedDate) return
    setVisibleMonth(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const monthLabel = useMemo(() => (
    new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)
  ), [visibleMonth])

  const displayValue = useMemo(() => {
    if (!selectedDate) return ''
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(selectedDate)
  }, [selectedDate])

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const today = useMemo(() => new Date(), [])

  const showMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const handleSelectDate = (date: Date) => {
    onChange(formatDateValue(date))
    setIsOpen(false)
  }

  const buttonClasses = className || 'w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
  const containerClasses = className.includes('flex-1') ? 'relative flex-1 min-w-0' : 'relative w-full'

  return (
    <div ref={rootRef} className={containerClasses}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className={`${buttonClasses} flex w-full items-center justify-between text-left bg-white`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={`pr-6 ${selectedDate ? 'text-gray-900' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        <svg className="ml-3 h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6 2a1 1 0 012 0v1h4V2a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h1V2zm9 6H5v7h10V8z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => showMonth(-1)}
              className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              aria-label="Previous month"
            >
              Prev
            </button>
            <div className="text-sm font-semibold text-gray-900">{monthLabel}</div>
            <button
              type="button"
              onClick={() => showMonth(1)}
              className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              aria-label="Next month"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {weekdayLabels.map((weekday) => (
              <div key={weekday} className="py-2">
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-9" />
              }

              const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
              const isToday = isSameDay(date, today)

              return (
                <button
                  key={formatDateValue(date)}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  className={[
                    'h-9 rounded-lg text-sm transition',
                    isSelected ? 'bg-green-600 text-white hover:bg-green-700' : 'text-gray-700 hover:bg-gray-100',
                    isToday && !isSelected ? 'border border-green-300' : 'border border-transparent',
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setVisibleMonth(today)}
              className="text-sm font-medium text-green-700 hover:text-green-800"
            >
              Go to today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}