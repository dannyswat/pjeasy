import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useListReleases } from './useListReleases'
import { useCreateRelease } from './useCreateRelease'
import { useUpdateReleaseStatus } from './useUpdateReleaseStatus'
import { useDeleteRelease } from './useDeleteRelease'
import { useCompleteRelease } from './useCompleteRelease'
import { ReleaseStatus, ReleaseStatusDisplay, type ConfirmedReleaseItem, type ReleaseResponse } from './releaseTypes'
import CreateReleaseForm from './CreateReleaseForm'
import CompleteReleaseModal from './CompleteReleaseModal'
import { useProjectRole } from '../projects/useProjectRole'

export default function ReleasesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [completingRelease, setCompletingRelease] = useState<ReleaseResponse | null>(null)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { releases, total, isLoading, refetch } = useListReleases({
    projectId: projectIdNum,
    page,
    pageSize,
    status: statusFilter || undefined,
  })
  const createRelease = useCreateRelease()
  const updateStatus = useUpdateReleaseStatus()
  const deleteRelease = useDeleteRelease()
  const completeRelease = useCompleteRelease()
  const { canWrite } = useProjectRole(projectIdNum)

  const totalPages = Math.ceil(total / pageSize)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 md:px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view releases.</p>
          <button
            onClick={() => navigate('/projects')}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Go to Projects
          </button>
        </div>
      </div>
    )
  }

  const handleCreateSubmit = async (data: { version: string; description: string; targetDate?: string }) => {
    try {
      await createRelease.mutateAsync({ projectId: projectIdNum, ...data })
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create release')
    }
  }

  const handleStatusChange = async (releaseId: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ releaseId, status })
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const handleComplete = async (confirmedItems: ConfirmedReleaseItem[]) => {
    if (!completingRelease) return
    try {
      await completeRelease.mutateAsync({ releaseId: completingRelease.id, confirmedItems })
      setCompletingRelease(null)
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete release')
    }
  }

  const handleDelete = async (releaseId: number) => {
    if (!window.confirm('Are you sure you want to delete this release?')) return
    try {
      await deleteRelease.mutateAsync({ releaseId })
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete release')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ReleaseStatus.OPEN: return 'bg-blue-100 text-blue-800 border-blue-200'
      case ReleaseStatus.IN_UAT: return 'bg-orange-100 text-orange-800 border-orange-200'
      case ReleaseStatus.COMPLETED: return 'bg-green-100 text-green-800 border-green-200'
      case ReleaseStatus.ON_HOLD: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case ReleaseStatus.ABANDONED: return 'bg-gray-100 text-gray-600 border-gray-200'
      case ReleaseStatus.ROLLED_BACK: return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Releases</h1>
          <p className="text-gray-600 mt-1">Manage releases and track deployed items</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Release
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(ReleaseStatusDisplay).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-sm text-gray-600">Loading releases...</p>
        </div>
      ) : releases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No releases found.</p>
        </div>
      ) : (
        <>
          {/* Releases List */}
          <div className="space-y-3">
            {releases.map(release => (
              <div key={release.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-gray-500">{release.version}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(release.status)}`}>
                        {ReleaseStatusDisplay[release.status] || release.status}
                      </span>
                    </div>
                    <h3
                      className="text-lg font-medium text-gray-900 cursor-pointer hover:text-indigo-600"
                      onClick={() => navigate(`/projects/${projectId}/releases/${release.id}`)}
                    >
                      Release {release.version}
                    </h3>
                    {release.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: release.description }} />
                    )}
                    {release.targetDate && (
                      <p className="text-sm text-gray-500 mt-1">Target: {new Date(release.targetDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-2 shrink-0">
                      {release.status !== ReleaseStatus.COMPLETED && release.status !== ReleaseStatus.ABANDONED && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value === 'complete') {
                              setCompletingRelease(release)
                            } else if (e.target.value) {
                              handleStatusChange(release.id, e.target.value)
                            }
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Change Status...</option>
                          {release.status !== ReleaseStatus.OPEN && <option value={ReleaseStatus.OPEN}>Open</option>}
                          {release.status !== ReleaseStatus.IN_UAT && <option value={ReleaseStatus.IN_UAT}>In UAT</option>}
                          <option value="complete">Complete Release</option>
                          {release.status !== ReleaseStatus.ON_HOLD && <option value={ReleaseStatus.ON_HOLD}>On Hold</option>}
                          <option value={ReleaseStatus.ABANDONED}>Abandon</option>
                          <option value={ReleaseStatus.ROLLED_BACK}>Roll Back</option>
                        </select>
                      )}
                      <button
                        onClick={() => handleDelete(release.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete release"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateReleaseForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createRelease.isPending}
        />
      )}

      {/* Complete Modal */}
      {completingRelease && (
        <CompleteReleaseModal
          release={completingRelease}
          onComplete={handleComplete}
          onCancel={() => setCompletingRelease(null)}
          isLoading={completeRelease.isPending}
        />
      )}
    </div>
  )
}
