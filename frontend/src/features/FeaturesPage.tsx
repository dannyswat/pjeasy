import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListFeatures } from './useListFeatures'
import { useUpdateFeature } from './useUpdateFeature'
import { useDeleteFeature } from './useDeleteFeature'
import { useCreateFeature } from './useCreateFeature'
import { FeatureStatus, FeaturePriority, FeatureStatusDisplay, type FeatureResponse } from './featureTypes'
import EditFeatureForm from './EditFeatureForm'
import CreateFeatureForm from './CreateFeatureForm'
import { UserLabel } from '../components/UserLabel'

export default function FeaturesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [editingFeature, setEditingFeature] = useState<FeatureResponse | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { features, total, isLoading, refetch } = useListFeatures({ 
    projectId: projectIdNum, 
    page, 
    pageSize, 
    status: statusFilter,
    priority: priorityFilter 
  })
  const updateFeature = useUpdateFeature()
  const deleteFeature = useDeleteFeature()
  const createFeature = useCreateFeature()

  const totalPages = Math.ceil(total / pageSize)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view and manage features.</p>
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

  const handleDelete = async (featureId: number) => {
    if (!window.confirm('Are you sure you want to delete this feature?')) return

    try {
      await deleteFeature.mutateAsync({
        featureId,
        projectId: projectIdNum,
      })
      refetch()
    } catch (error) {
      console.error('Failed to delete feature:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case FeaturePriority.IMMEDIATE:
        return 'bg-red-100 text-red-800 border-red-300'
      case FeaturePriority.URGENT:
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case FeaturePriority.HIGH:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case FeaturePriority.NORMAL:
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case FeaturePriority.LOW:
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case FeatureStatus.OPEN:
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case FeatureStatus.ASSIGNED:
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case FeatureStatus.IN_PROGRESS:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case FeatureStatus.IN_REVIEW:
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case FeatureStatus.COMPLETED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case FeatureStatus.CLOSED:
        return 'bg-gray-50 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const now = new Date()
    const isOverdue = date < now
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return (
      <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
        Due: {formattedDate}
      </span>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Features</h1>
          <p className="text-sm text-gray-600 mt-1">Plan and track product features</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition flex items-center"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Feature
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center space-x-3">
        <label className="text-xs font-medium text-gray-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">All</option>
          <option value={FeatureStatus.OPEN}>Open</option>
          <option value={FeatureStatus.ASSIGNED}>Assigned</option>
          <option value={FeatureStatus.IN_PROGRESS}>In Progress</option>
          <option value={FeatureStatus.IN_REVIEW}>In Review</option>
          <option value={FeatureStatus.COMPLETED}>Completed</option>
          <option value={FeatureStatus.CLOSED}>Closed</option>
        </select>

        <label className="text-xs font-medium text-gray-700">Priority:</label>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">All</option>
          <option value={FeaturePriority.IMMEDIATE}>Immediate</option>
          <option value={FeaturePriority.URGENT}>Urgent</option>
          <option value={FeaturePriority.HIGH}>High</option>
          <option value={FeaturePriority.NORMAL}>Normal</option>
          <option value={FeaturePriority.LOW}>Low</option>
        </select>
      </div>

      {/* Features List */}
      {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="mt-3 text-sm text-gray-600">Loading features...</p>
              </div>
            </div>
          ) : features.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No features</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new feature.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 hover:shadow-sm transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">{feature.refNum}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(feature.status)}`}>
                          {FeatureStatusDisplay[feature.status] || feature.status}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(feature.priority)}`}>
                          {feature.priority}
                        </span>
                        {formatDeadline(feature.deadline)}
                      </div>
                      <h3 
                        className="text-sm font-medium text-gray-900 hover:text-green-600 cursor-pointer truncate"
                        onClick={() => navigate(`/projects/${projectId}/features/${feature.id}`)}
                      >
                        {feature.title}
                      </h3>
                      {feature.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{feature.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                        {feature.assignedTo ? (
                          <span className="flex items-center space-x-1">
                            <span>Assigned to:</span>
                            <UserLabel userId={feature.assignedTo} />
                          </span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                        {feature.points > 0 && (
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>{feature.points} pts</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => setEditingFeature(feature)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit feature"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(feature.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete feature"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} features
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Feature Modal */}
      {showCreateModal && (
        <CreateFeatureForm
          projectId={projectIdNum}
          onCancel={() => setShowCreateModal(false)}
          isPending={createFeature.isPending}
          onSubmit={async (data: {
            title: string
            description: string
            priority: string
            assignedTo?: number
            points: number
            deadline?: string
            tags: string
          }) => {
            try {
              await createFeature.mutateAsync({
                projectId: projectIdNum,
                ...data,
              })
              setShowCreateModal(false)
              refetch()
            } catch (error) {
              console.error('Failed to create feature:', error)
            }
          }}
        />
      )}

      {/* Edit Feature Modal */}
      {editingFeature && (
        <EditFeatureForm
          feature={editingFeature}
          projectId={projectIdNum}
          onClose={() => setEditingFeature(null)}
          onCancel={() => setEditingFeature(null)}
          isPending={updateFeature.isPending}
          onSubmit={async (data: {
            title: string
            description: string
            priority: string
            assignedTo?: number
            points: number
            deadline?: string
            tags: string
          }) => {
            try {
              await updateFeature.mutateAsync({
                featureId: editingFeature.id,
                projectId: projectIdNum,
                ...data,
              })
              setEditingFeature(null)
              refetch()
            } catch (error) {
              console.error('Failed to update feature:', error)
            }
          }}
        />
      )}
    </div>
  )
}
