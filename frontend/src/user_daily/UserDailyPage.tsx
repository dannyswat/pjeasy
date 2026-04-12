import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useAddUserDailyItem,
  useCreateUserDailyTimeLog,
  useDeleteUserDailyTimeLog,
  useRemoveUserDailyItem,
  useUpdateUserDailyItemStatus,
  useUpdateUserDailyTimeLog,
  useUserDailyBoard,
} from './useUserDailyApi'
import type { UserDailyItemResponse } from './userDailyTypes'

const standardDayHours = 8
const resizeStepWidth = 28

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(date: string, days: number) {
  const current = new Date(`${date}T00:00:00Z`)
  current.setUTCDate(current.getUTCDate() + days)
  return current.toISOString().slice(0, 10)
}

function formatStatus(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase())
}

function buildItemPath(item: UserDailyItemResponse) {
  switch (item.itemType) {
    case 'task':
      return `/projects/${item.projectId}/tasks`
    case 'issue':
      return `/projects/${item.projectId}/issues/${item.itemId}`
    case 'feature':
      return `/projects/${item.projectId}/features/${item.itemId}`
    default:
      return `/projects/${item.projectId}`
  }
}

export default function UserDailyPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [candidateFilter, setCandidateFilter] = useState('')
  const [draggingDailyItemId, setDraggingDailyItemId] = useState<number | null>(null)
  const [isDropActive, setIsDropActive] = useState(false)
  const [resizingLog, setResizingLog] = useState<{ logId: number; durationUnits: number } | null>(null)

  const boardQuery = useUserDailyBoard(selectedDate)
  const addItem = useAddUserDailyItem(selectedDate)
  const removeItem = useRemoveUserDailyItem(selectedDate)
  const updateStatus = useUpdateUserDailyItemStatus(selectedDate)
  const createTimeLog = useCreateUserDailyTimeLog(selectedDate)
  const updateTimeLog = useUpdateUserDailyTimeLog(selectedDate)
  const deleteTimeLog = useDeleteUserDailyTimeLog(selectedDate)

  const board = boardQuery.data

  const itemsById = useMemo(() => {
    return new Map((board?.items ?? []).map((item) => [item.id, item]))
  }, [board?.items])

  const filteredCandidates = useMemo(() => {
    const query = candidateFilter.trim().toLowerCase()
    if (!query) {
      return board?.candidateItems ?? []
    }

    return (board?.candidateItems ?? []).filter((candidate) => {
      return [candidate.title, candidate.projectName, candidate.itemType, candidate.refNum ?? '', candidate.status]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [board?.candidateItems, candidateFilter])

  const standardProgress = Math.min((board?.totalHours ?? 0) / standardDayHours, 1) * 100

  const handleAddCandidate = async (itemType: 'task' | 'issue' | 'feature', itemId: number) => {
    try {
      await addItem.mutateAsync({ date: selectedDate, itemType, itemId })
    } catch (error) {
      console.error('Failed to add daily item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add daily item')
    }
  }

  const handleStatusChange = async (dailyItemId: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ dailyItemId, request: { status } })
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const handleLogHour = async (dailyItemId: number) => {
    try {
      await createTimeLog.mutateAsync({ userDailyItemId: dailyItemId, durationUnits: 1 })
    } catch (error) {
      console.error('Failed to create time log:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add time log')
    }
  }

  const handleDeleteTimeLog = async (timeLogId: number) => {
    try {
      await deleteTimeLog.mutateAsync(timeLogId)
    } catch (error) {
      console.error('Failed to delete time log:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete time log')
    }
  }

  const handleDropOnTimeUsage = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const rawDailyItemId = event.dataTransfer.getData('text/user-daily-item-id')
    const dailyItemId = rawDailyItemId ? parseInt(rawDailyItemId, 10) : 0
    setDraggingDailyItemId(null)
    setIsDropActive(false)

    if (!dailyItemId) {
      return
    }

    await handleLogHour(dailyItemId)
  }

  const handleResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>, logId: number, durationUnits: number) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    const initialX = event.clientX
    const initialDurationUnits = durationUnits
    let nextDurationUnits = durationUnits

    setResizingLog({ logId, durationUnits })

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaUnits = Math.round((moveEvent.clientX - initialX) / resizeStepWidth)
      nextDurationUnits = Math.max(1, initialDurationUnits + deltaUnits)
      setResizingLog({ logId, durationUnits: nextDurationUnits })
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    const handlePointerUp = async () => {
      cleanup()

      if (nextDurationUnits !== initialDurationUnits) {
        try {
          await updateTimeLog.mutateAsync({
            timeLogId: logId,
            request: { durationUnits: nextDurationUnits },
          })
        } catch (error) {
          console.error('Failed to update time log:', error)
          toast.error(error instanceof Error ? error.message : 'Failed to update time log')
        }
      }

      setResizingLog(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  if (boardQuery.isLoading) {
    return <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-600">Loading daily workspace...</div>
  }

  if (!board) {
    return <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-red-600">Failed to load the daily workspace.</div>
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">My Work</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Daily board</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Pull assigned features, issues, and tasks into the day, update status in place, and keep a simple running time log against an 8-hour standard day.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button aria-label="Previous day" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50">
            ←
          </button>
          <input value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} type="date" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500" />
          <button onClick={() => setSelectedDate(getTodayDate())} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50">
            Today
          </button>
          <button aria-label="Next day" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50">
            →
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1.65fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Daily list</h2>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {board.items.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Add work from the candidate list to build the day.
                </div>
              )}

              {board.items.map((item) => (
                <article
                  key={item.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/user-daily-item-id', String(item.id))
                    setDraggingDailyItemId(item.id)
                  }}
                  onDragEnd={() => {
                    setDraggingDailyItemId(null)
                    setIsDropActive(false)
                  }}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition ${draggingDailyItemId === item.id ? 'border-sky-300 shadow-md' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-medium uppercase tracking-[0.16em] text-slate-700">{item.itemType}</span>
                        {item.refNum && <span>{item.refNum}</span>}
                        <span>{item.projectName}</span>
                      </div>
                      <Link to={buildItemPath(item)} className="mt-2 block truncate text-base font-semibold text-slate-900 hover:text-sky-700">
                        {item.title}
                      </Link>
                    </div>
                    <button
                      aria-label="Remove daily item"
                      onClick={() => removeItem.mutate(item.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
                    <label className="min-w-0 flex-1 text-sm text-slate-600">
                      <select
                        value={item.status}
                        onChange={(event) => handleStatusChange(item.id, event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
                      >
                        {item.statusOptions.map((status) => (
                          <option key={status} value={status}>{formatStatus(status)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Candidate items</h2>
                <p className="text-sm text-slate-500">Cross-project items currently assigned to you.</p>
              </div>
              <div className="text-sm text-slate-500">{filteredCandidates.length} items</div>
            </div>

            <input
              value={candidateFilter}
              onChange={(event) => setCandidateFilter(event.target.value)}
              placeholder="Filter by project, title, ref, or status"
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white"
            />

            <div className="mt-4 max-h-112 space-y-3 overflow-y-auto pr-1">
              {filteredCandidates.map((candidate) => (
                <div key={`${candidate.itemType}-${candidate.itemId}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2 py-1 font-medium uppercase tracking-[0.16em] text-slate-700">{candidate.itemType}</span>
                        {candidate.refNum && <span>{candidate.refNum}</span>}
                        <span>{candidate.projectName}</span>
                      </div>
                      <div className="mt-2 truncate text-sm font-semibold text-slate-900">{candidate.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatStatus(candidate.status)}</div>
                    </div>
                    <button
                      disabled={candidate.alreadyAdded || addItem.isPending}
                      onClick={() => handleAddCandidate(candidate.itemType, candidate.itemId)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${candidate.alreadyAdded ? 'cursor-not-allowed border border-slate-200 bg-white text-slate-400' : 'bg-sky-600 text-white hover:bg-sky-700'}`}
                    >
                      {candidate.alreadyAdded ? 'Added' : 'Add'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section
          onDragOver={(event) => {
            event.preventDefault()
            setIsDropActive(true)
          }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={handleDropOnTimeUsage}
          className={`rounded-2xl border bg-white p-5 shadow-sm transition ${isDropActive ? 'border-sky-300 bg-sky-50/60' : 'border-slate-200'}`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Time usage</h2>
              <p className="text-sm text-slate-500">Drag a daily item here to log 1 hour. Drag the resize handle on an entry to change the time used.</p>
            </div>
            <div className="min-w-56 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="mt-1 text-3xl font-semibold">{board.totalHours.toFixed(1)}h</div>
                </div>
                <div className="text-right text-sm text-slate-500">Standard {standardDayHours}h</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${standardProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {board.timeLogs.length === 0 && (
              <div className={`rounded-xl border border-dashed px-4 py-6 text-sm ${isDropActive ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
                No time logged yet. Drag a daily item here to start tracking effort.
              </div>
            )}

            {board.timeLogs.map((log, index) => {
              const item = itemsById.get(log.userDailyItemId)
              if (!item) {
                return null
              }

              const durationUnits = resizingLog?.logId === log.id ? resizingLog.durationUnits : log.durationUnits
              const width = Math.min(100, (durationUnits / standardDayHours) * 100)

              return (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2 py-1 font-medium uppercase tracking-[0.16em] text-slate-700">Entry {index + 1}</span>
                        <span>{item.projectName}</span>
                        <span>{formatStatus(item.itemType)}</span>
                      </div>
                      <Link to={buildItemPath(item)} className="mt-2 block truncate text-sm font-semibold text-slate-900 hover:text-sky-700">
                        {item.title}
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-52">
                        <div className="relative h-10 rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                          <div className="absolute inset-y-1 left-1 rounded-full bg-sky-500" style={{ width: `calc(${width}% - 0.5rem)` }}>
                            <div className="flex h-full items-center justify-between gap-2 pl-3 pr-1.5 text-xs font-semibold text-white">
                              <span>{durationUnits}h</span>
                              <button
                                type="button"
                                onPointerDown={(event) => handleResizePointerDown(event, log.id, durationUnits)}
                                className="flex h-6 w-6 cursor-ew-resize items-center justify-center rounded-full bg-white/25 text-white hover:bg-white/35"
                                aria-label="Resize time log"
                              >
                                ↔
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        aria-label="Delete time log"
                        onClick={() => handleDeleteTimeLog(log.id)}
                        disabled={deleteTimeLog.isPending}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-white text-base font-semibold text-rose-600 disabled:cursor-not-allowed disabled:text-rose-300"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}