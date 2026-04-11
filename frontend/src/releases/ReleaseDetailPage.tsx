import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useGetRelease } from './useGetRelease'
import { useGetReleaseItems } from './useGetReleaseItems'
import { useUpdateRelease } from './useUpdateRelease'
import { useUpdateReleaseStatus } from './useUpdateReleaseStatus'
import { useCompleteRelease } from './useCompleteRelease'
import { useDeleteRelease } from './useDeleteRelease'
import { ReleaseStatus, ReleaseStatusDisplay, type ConfirmedReleaseItem } from './releaseTypes'
import CompleteReleaseModal from './CompleteReleaseModal'
import PrepareReleaseUATModal from './PrepareReleaseUATModal'
import { useProjectRole } from '../projects/useProjectRole'

export default function ReleaseDetailPage() {
  const { projectId, releaseId } = useParams<{ projectId: string; releaseId: string }>()
  const navigate = useNavigate()
  const releaseIdNum = releaseId ? parseInt(releaseId) : null
  const projectIdNum = projectId ? parseInt(projectId) : 0

  const { release, isLoading, refetch } = useGetRelease(releaseIdNum)
  const { items, isLoading: itemsLoading, refetch: refetchItems } = useGetReleaseItems(releaseIdNum)
  const updateRelease = useUpdateRelease()
  const updateStatus = useUpdateReleaseStatus()
  const completeRelease = useCompleteRelease()
  const deleteRelease = useDeleteRelease()
  const { canWrite } = useProjectRole(projectIdNum)

  const [isEditing, setIsEditing] = useState(false)
  const [editVersion, setEditVersion] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showUATModal, setShowUATModal] = useState(false)

  const startEdit = () => {
    if (!release) return
    setEditVersion(release.version)
    setEditDescription(release.description)
    setEditTargetDate(release.targetDate || '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!release) return
    try {
      await updateRelease.mutateAsync({
        releaseId: release.id,
        version: editVersion,
        description: editDescription,
        targetDate: editTargetDate || undefined,
      })
      setIsEditing(false)
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update release')
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!release) return
    try {
      await updateStatus.mutateAsync({ releaseId: release.id, status })
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const handleMoveToUAT = async (confirmedItems: ConfirmedReleaseItem[]) => {
    if (!release) return
    try {
      await updateStatus.mutateAsync({ releaseId: release.id, status: ReleaseStatus.IN_UAT, confirmedItems })
      setShowUATModal(false)
      refetch()
      refetchItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update release to UAT')
    }
  }

  const handleComplete = async (confirmedItems: ConfirmedReleaseItem[]) => {
    if (!release) return
    try {
      await completeRelease.mutateAsync({ releaseId: release.id, confirmedItems })
      setShowCompleteModal(false)
      refetch()
      refetchItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete release')
    }
  }

  const handleDelete = async () => {
    if (!release) return
    if (!window.confirm('Are you sure you want to delete this release?')) return
    try {
      await deleteRelease.mutateAsync({ releaseId: release.id })
      navigate(`/projects/${projectId}/releases`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete release')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ReleaseStatus.OPEN: return 'bg-blue-100 text-blue-800'
      case ReleaseStatus.IN_UAT: return 'bg-orange-100 text-orange-800'
      case ReleaseStatus.COMPLETED: return 'bg-green-100 text-green-800'
      case ReleaseStatus.ON_HOLD: return 'bg-yellow-100 text-yellow-800'
      case ReleaseStatus.ABANDONED: return 'bg-gray-100 text-gray-600'
      case ReleaseStatus.ROLLED_BACK: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getItemTypeBadge = (itemType: string) => {
    switch (itemType) {
      case 'feature': return 'bg-purple-100 text-purple-800'
      case 'issue': return 'bg-red-100 text-red-800'
      case 'task': return 'bg-blue-100 text-blue-800'
      case 'idea': return 'bg-yellow-100 text-yellow-800'
      case 'sprint': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 md:px-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-sm text-gray-600">Loading release...</p>
        </div>
      </div>
    )
  }

  if (!release) {
    return (
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 md:px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">Release not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 md:px-6">
      {/* Back link */}
      <button
        onClick={() => navigate(`/projects/${projectId}/releases`)}
        className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-flex items-center"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Releases
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                value={editVersion}
                onChange={(e) => setEditVersion(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
              <input
                type="date"
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono text-gray-500">{release.version}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusBadge(release.status)}`}>
                    {ReleaseStatusDisplay[release.status] || release.status}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Release {release.version}</h1>
                {release.targetDate && (
                  <p className="text-sm text-gray-500 mt-2">Target Date: {new Date(release.targetDate).toLocaleDateString()}</p>
                )}
                {release.description && (
                  <div className="mt-4 text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: release.description }} />
                )}
              </div>
              {canWrite && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={startEdit} className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                  <button onClick={handleDelete} className="text-sm px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
            {canWrite && release.status !== ReleaseStatus.COMPLETED && release.status !== ReleaseStatus.ABANDONED && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2 flex-wrap">
                {release.status !== ReleaseStatus.IN_UAT && (
                  <button onClick={() => setShowUATModal(true)} className="text-sm px-3 py-1 bg-orange-100 text-orange-800 rounded hover:bg-orange-200">Move to UAT</button>
                )}
                <button onClick={() => setShowCompleteModal(true)} className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200">Complete Release</button>
                {release.status !== ReleaseStatus.ON_HOLD && (
                  <button onClick={() => handleStatusChange(ReleaseStatus.ON_HOLD)} className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">Put On Hold</button>
                )}
                {release.status === ReleaseStatus.ON_HOLD && (
                  <button onClick={() => handleStatusChange(ReleaseStatus.OPEN)} className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200">Reopen</button>
                )}
                <button onClick={() => handleStatusChange(ReleaseStatus.ABANDONED)} className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Abandon</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Linked Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Linked Items</h2>
        {itemsLoading ? (
          <p className="text-gray-500">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500">No items linked to this release. Link items from features, issues, tasks, or ideas.</p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={`${item.itemType}-${item.id}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getItemTypeBadge(item.itemType)}`}>
                  {item.itemType}
                </span>
                {item.refNum && <span className="text-sm font-mono text-gray-500">{item.refNum}</span>}
                <span className="text-sm text-gray-900 flex-1">{item.title}</span>
                <span className="text-xs text-gray-500">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <CompleteReleaseModal
          release={release}
          onComplete={handleComplete}
          onCancel={() => setShowCompleteModal(false)}
          isLoading={completeRelease.isPending}
        />
      )}

      {showUATModal && (
        <PrepareReleaseUATModal
          projectId={projectIdNum}
          release={release}
          onConfirm={handleMoveToUAT}
          onCancel={() => setShowUATModal(false)}
          isLoading={updateStatus.isPending}
        />
      )}
    </div>
  )
}
