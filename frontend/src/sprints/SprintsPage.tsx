import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListSprints } from './useListSprints'
import { useCreateSprint } from './useCreateSprint'
import { useStartSprint } from './useStartSprint'
import { useCloseSprint } from './useCloseSprint'
import { useDeleteSprint } from './useDeleteSprint'
import { SprintStatus, SprintStatusDisplay, type SprintResponse } from './sprintTypes'
import CreateSprintForm from './CreateSprintForm'
import CloseSprintModal from './CloseSprintModal'

export default function SprintsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [closingSprint, setClosingSprint] = useState<SprintResponse | null>(null)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { sprints, total, isLoading, refetch } = useListSprints({ projectId: projectIdNum, page, pageSize })
  const createSprint = useCreateSprint()
  const startSprint = useStartSprint()
  const closeSprint = useCloseSprint()
  const deleteSprint = useDeleteSprint()

  const totalPages = Math.ceil(total / pageSize)
  const activeSprint = sprints.find(s => s.status === SprintStatus.ACTIVE)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view and manage sprints.</p>
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

  const handleCreateSubmit = async (data: {
    name: string
    goal: string
    startDate?: string
    endDate?: string
  }) => {
    try {
      await createSprint.mutateAsync({
        projectId: projectIdNum,
        ...data,
      })
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to create sprint:', error)
    }
  }

  const handleStartSprint = async (sprintId: number) => {
    if (activeSprint) {
      alert('There is already an active sprint. Please close it before starting a new one.')
      return
    }

    try {
      await startSprint.mutateAsync({ sprintId })
      refetch()
    } catch (error) {
      console.error('Failed to start sprint:', error)
    }
  }

  const handleCloseSubmit = async (data: {
    createNewSprint: boolean
    newSprintName?: string
    newSprintGoal?: string
    newSprintEndDate?: string
  }) => {
    if (!closingSprint) return

    try {
      await closeSprint.mutateAsync({
        sprintId: closingSprint.id,
        ...data,
      })
      setClosingSprint(null)
      refetch()
    } catch (error) {
      console.error('Failed to close sprint:', error)
    }
  }

  const handleDelete = async (sprintId: number) => {
    if (!window.confirm('Are you sure you want to delete this sprint?')) return

    try {
      await deleteSprint.mutateAsync({ sprintId })
      refetch()
    } catch (error) {
      console.error('Failed to delete sprint:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case SprintStatus.PLANNING:
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case SprintStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200'
      case SprintStatus.CLOSED:
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
          <p className="text-gray-600 mt-1">Manage your project sprints and track progress</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Sprint
        </button>
      </div>

      {/* Active Sprint Banner */}
      {activeSprint && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <h3 className="font-semibold text-green-900">{activeSprint.name}</h3>
                <p className="text-sm text-green-700">
                  Active Sprint • {activeSprint.startDate || 'No start date'} 
                  {activeSprint.endDate && ` - ${activeSprint.endDate}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/projects/${projectId}/sprints/${activeSprint.id}/board`)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                View Board
              </button>
              <button
                onClick={() => setClosingSprint(activeSprint)}
                className="bg-white text-green-700 border border-green-300 px-4 py-2 rounded-lg hover:bg-green-50 transition text-sm"
              >
                Close Sprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : sprints.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sprints Yet</h3>
          <p className="text-gray-600 mb-4">Create your first sprint to start organizing your tasks.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Create Sprint
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sprint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sprints.map((sprint) => (
                <tr key={sprint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sprint.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(sprint.status)}`}>
                      {SprintStatusDisplay[sprint.status as keyof typeof SprintStatusDisplay]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sprint.startDate || 'Not started'}
                    {sprint.endDate && ` - ${sprint.endDate}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {sprint.goal || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {sprint.status === SprintStatus.PLANNING && (
                      <>
                        <button
                          onClick={() => handleStartSprint(sprint.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleDelete(sprint.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {sprint.status === SprintStatus.ACTIVE && (
                      <>
                        <button
                          onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.id}/board`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Board
                        </button>
                        <button
                          onClick={() => setClosingSprint(sprint)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Close
                        </button>
                      </>
                    )}
                    {sprint.status === SprintStatus.CLOSED && (
                      <button
                        onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.id}/board`)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} sprints)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Create New Sprint</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CreateSprintForm
              onSubmit={handleCreateSubmit}
              onCancel={() => setShowCreateModal(false)}
              isSubmitting={createSprint.isPending}
            />
          </div>
        </div>
      )}

      {/* Close Sprint Modal */}
      {closingSprint && (
        <CloseSprintModal
          sprint={closingSprint}
          onSubmit={handleCloseSubmit}
          onCancel={() => setClosingSprint(null)}
          isSubmitting={closeSprint.isPending}
        />
      )}
    </div>
  )
}
