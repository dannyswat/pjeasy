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
  const { changes, isLoading } = useStatusChanges(projectId, itemType, itemId)

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">{changes.length} change{changes.length === 1 ? '' : 's'}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
      ) : changes.length === 0 ? (
        <div className="rounded border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
          No status changes recorded yet.
        </div>
      ) : (
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
      )}
    </div>
  )
}