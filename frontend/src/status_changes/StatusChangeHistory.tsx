import { useState } from 'react'
import { UserLabel } from '../components/UserLabel'
import { useStatusChanges } from './useStatusChanges'

interface StatusChangeHistoryProps {
  projectId: number
  itemType: string
  itemId: number
  title?: string
}

function formatStatusLabel(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export default function StatusChangeHistory({
  projectId,
  itemType,
  itemId,
  title = 'Status History',
}: StatusChangeHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { changes, isLoading } = useStatusChanges(projectId, itemType, itemId, isOpen)

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className={isOpen ? 'mb-3 flex items-center justify-between' : 'flex items-center justify-between'}>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="text-xs font-medium text-gray-500 transition hover:text-gray-700"
        >
          {isOpen ? 'hide status change history' : 'show status change history'}
        </button>
      </div>

      {isOpen && isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
      ) : isOpen && changes.length === 0 ? (
        <div className="rounded border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
          No status changes recorded yet.
        </div>
      ) : isOpen ? (
        <div className="space-y-3">
          {changes.map((change) => (
            <div key={change.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-900">
                  <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                    {formatStatusLabel(change.oldStatus)}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {formatStatusLabel(change.newStatus)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(change.changedAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Changed by{' '}
                {change.changedBy ? <UserLabel userId={change.changedBy} /> : <span className="font-medium text-gray-700">System</span>}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}