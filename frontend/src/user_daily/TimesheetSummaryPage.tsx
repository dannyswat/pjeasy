import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useUserDailySummary } from './useUserDailyApi'

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(date: string, days: number) {
  const current = new Date(`${date}T00:00:00Z`)
  current.setUTCDate(current.getUTCDate() + days)
  return current.toISOString().slice(0, 10)
}

export default function TimesheetSummaryPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [range, setRange] = useState<'day' | 'week' | 'month'>('week')

  const summaryQuery = useUserDailySummary(selectedDate, range)
  const summary = summaryQuery.data

  if (summaryQuery.isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-600">Loading timesheet summary...</div>
  }

  if (!summary) {
    return <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-red-600">Failed to load the timesheet summary.</div>
  }

  const maxProjectHours = summary.projects[0]?.totalHours ?? 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Timesheet</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Effort summary</h1>
          <p className="mt-2 text-sm text-slate-600">
            Review how your logged effort is distributed across projects for a day, week, or month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Back
          </button>
          <input value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} type="date" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
          <button onClick={() => setSelectedDate(getTodayDate())} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Today
          </button>
          <button onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Forward
          </button>
          <Link to="/my/daily" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Open daily board
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['day', 'week', 'month'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setRange(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${range === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Range</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{summary.startDate} to {summary.endDate}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total effort</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.totalHours.toFixed(1)}h</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Projects touched</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.projects.length}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">By project</h2>
          <div className="mt-4 space-y-4">
            {summary.projects.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">No effort logged in this range yet.</div>}
            {summary.projects.map((project) => {
              const width = maxProjectHours === 0 ? 0 : (project.totalHours / maxProjectHours) * 100
              return (
                <div key={project.projectId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="font-medium text-slate-900">{project.projectName}</div>
                    <div className="text-slate-500">{project.totalHours.toFixed(1)}h</div>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Day breakdown</h2>
          <div className="mt-4 space-y-3">
            {summary.days.map((day) => (
              <div key={day.date} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <div className="font-medium text-slate-900">{day.date}</div>
                <div className="text-slate-600">{day.totalHours.toFixed(1)}h</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}