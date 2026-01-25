import { useState } from 'react'
import { useListWikiPageChanges, usePendingChanges, useRejectChange, useResolveConflict } from './useWikiPageChanges'
import { WikiPageChangeStatus, WikiPageChangeStatusDisplay, WikiPageItemType } from './wikiTypes'
import { UserLabel } from '../components/UserLabel'

interface WikiPageChangesPanelProps {
  pageId: number
  projectId: number
  onClose: () => void
  onMergeComplete: () => void
}

export default function WikiPageChangesPanel({ pageId, onClose }: WikiPageChangesPanelProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [page, setPage] = useState(1)
  const [selectedChangeId, setSelectedChangeId] = useState<number | null>(null)
  const [resolveContent, setResolveContent] = useState('')
  const [showResolveModal, setShowResolveModal] = useState(false)
  const pageSize = 10

  const { changes: pendingChanges, refetch: refetchPending } = usePendingChanges(pageId)
  const { changes: allChanges, total, refetch: refetchHistory } = useListWikiPageChanges(pageId, page, pageSize)
  const rejectChange = useRejectChange()
  const resolveConflict = useResolveConflict()

  const getStatusColor = (status: string) => {
    switch (status) {
      case WikiPageChangeStatus.PENDING:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case WikiPageChangeStatus.MERGED:
        return 'bg-green-50 text-green-700 border-green-200'
      case WikiPageChangeStatus.REJECTED:
        return 'bg-red-50 text-red-700 border-red-200'
      case WikiPageChangeStatus.CONFLICT:
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case WikiPageItemType.FEATURE:
        return 'Feature'
      case WikiPageItemType.ISSUE:
        return 'Issue'
      default:
        return itemType
    }
  }

  const handleReject = async (changeId: number) => {
    if (!window.confirm('Are you sure you want to reject this change?')) return

    try {
      await rejectChange.mutateAsync({ changeId, pageId })
      refetchPending()
      refetchHistory()
    } catch (error) {
      console.error('Failed to reject change:', error)
    }
  }

  const handleStartResolve = (changeId: number, snapshot: string) => {
    setSelectedChangeId(changeId)
    setResolveContent(snapshot)
    setShowResolveModal(true)
  }

  const handleResolve = async () => {
    if (!selectedChangeId) return

    try {
      await resolveConflict.mutateAsync({
        changeId: selectedChangeId,
        pageId,
        data: { content: resolveContent },
      })
      setShowResolveModal(false)
      setSelectedChangeId(null)
      refetchPending()
      refetchHistory()
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    }
  }

  const displayChanges = activeTab === 'pending' ? pendingChanges : allChanges
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
      <div className="bg-white h-full w-full max-w-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Wiki Page Changes</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending ({pendingChanges.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              History ({total})
            </button>
          </nav>
        </div>

        {/* Changes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayChanges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {activeTab === 'pending' ? 'No pending changes' : 'No change history'}
            </div>
          ) : (
            <div className="space-y-4">
              {displayChanges.map((change) => (
                <div key={change.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(change.status)}`}>
                        {WikiPageChangeStatusDisplay[change.status] || change.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getItemTypeLabel(change.itemType)} #{change.itemId}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(change.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    <span className="mr-1">By:</span>
                    <UserLabel userId={change.createdBy} />
                  </div>

                  {change.mergedAt && (
                    <div className="text-xs text-gray-500 mb-2">
                      Merged: {new Date(change.mergedAt).toLocaleString()}
                    </div>
                  )}

                  {/* Actions */}
                  {(change.status === WikiPageChangeStatus.PENDING || change.status === WikiPageChangeStatus.CONFLICT) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {change.status === WikiPageChangeStatus.CONFLICT && (
                        <button
                          onClick={() => handleStartResolve(change.id, change.snapshot)}
                          className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition"
                        >
                          Resolve Conflict
                        </button>
                      )}
                      <button
                        onClick={() => handleReject(change.id)}
                        className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Preview toggle */}
                  <details className="mt-3">
                    <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                      View snapshot
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm overflow-x-auto">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: change.snapshot }}
                      />
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination for history */}
        {activeTab === 'history' && totalPages > 1 && (
          <div className="border-t p-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Info */}
        <div className="border-t p-4 bg-gray-50 text-sm text-gray-600">
          <p>
            <strong>Note:</strong> Changes are created when editing wiki pages through features or issues. 
            They are automatically merged when the feature/issue is completed.
          </p>
        </div>
      </div>

      {/* Resolve Conflict Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Resolve Conflict</h3>
                <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-gray-600 mb-4">
                Edit the content below to resolve the conflict. The resolved content will be used for the merge.
              </p>
              <textarea
                value={resolveContent}
                onChange={(e) => setResolveContent(e.target.value)}
                rows={20}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolveConflict.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {resolveConflict.isPending ? 'Resolving...' : 'Resolve & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
