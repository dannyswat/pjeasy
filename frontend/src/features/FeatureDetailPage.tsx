import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSecureApi } from '../apis/fetch'
import { useUpdateFeatureStatus } from './useUpdateFeatureStatus'
import { useDeleteFeature } from './useDeleteFeature'
import { FeatureStatus, FeatureStatusDisplay, type FeatureResponse } from './featureTypes'
import EditFeatureForm from './EditFeatureForm'
import Comments from '../comments/Comments'
import RelatedTasks from '../tasks/RelatedTasks'
import { UserLabel } from '../components/UserLabel'
import { useUpdateFeature } from './useUpdateFeature'
import ItemLink from '../components/ItemLink'

export default function FeatureDetailPage() {
  const { projectId, featureId } = useParams<{ projectId: string; featureId: string }>()
  const navigate = useNavigate()
  const [feature, setFeature] = useState<FeatureResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingFeature, setEditingFeature] = useState<FeatureResponse | null>(null)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const featureIdNum = featureId ? parseInt(featureId) : 0
  const updateFeatureStatus = useUpdateFeatureStatus()
  const deleteFeature = useDeleteFeature()
  const updateFeature = useUpdateFeature()

  const fetchFeature = async () => {
    try {
      setIsLoading(true)
      const data = await getSecureApi<FeatureResponse>(
        `/api/features/${featureIdNum}`
      )
      setFeature(data)
    } catch (error) {
      console.error('Failed to fetch feature:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeature()
  }, [projectIdNum, featureIdNum])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Immediate':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Urgent':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'Normal':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Low':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Assigned':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'InProgress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'InReview':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'Closed':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null
    const date = new Date(deadline)
    const now = new Date()
    const isOverdue = date < now && feature?.status !== FeatureStatus.COMPLETED && feature?.status !== FeatureStatus.CLOSED
    return (
      <div className={`${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
        <span className="text-gray-500">Deadline:</span>
        <span className={`ml-2 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
          {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          {isOverdue && <span className="ml-2 text-xs">(Overdue)</span>}
        </span>
      </div>
    )
  }

  const handleStatusChange = async (status: string) => {
    if (!feature) return

    try {
      await updateFeatureStatus.mutateAsync({
        featureId: feature.id,
        projectId: projectIdNum,
        status,
      })
      fetchFeature()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async () => {
    if (!feature || !window.confirm('Are you sure you want to delete this feature?')) return

    try {
      await deleteFeature.mutateAsync({
        featureId: feature.id,
        projectId: projectIdNum,
      })
      navigate(`/projects/${projectId}/features`)
    } catch (error) {
      console.error('Failed to delete feature:', error)
    }
  }

  const handleUpdateSubmit = async (data: {
    title: string
    description: string
    priority: string
    assignedTo?: number
    points: number
    deadline?: string
    tags: string
  }) => {
    if (!editingFeature) return

    try {
      await updateFeature.mutateAsync({
        featureId: editingFeature.id,
        projectId: projectIdNum,
        ...data,
      })
      setEditingFeature(null)
      fetchFeature()
    } catch (error) {
      console.error('Failed to update feature:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 flex justify-center items-center min-h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!feature) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">Feature Not Found</h3>
          <button
            onClick={() => navigate(`/projects/${projectId}/features`)}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Back to Features
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {editingFeature ? (
        <EditFeatureForm
          feature={editingFeature}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setEditingFeature(null)}
          isPending={updateFeature.isPending}
        />
      ) : (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/projects/${projectId}/features`)}
            className="flex items-center text-green-600 hover:text-green-700 transition text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Features
          </button>

          {/* Feature Detail */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h1 className="text-xl font-semibold text-gray-900">{feature.title}</h1>
                  <span className="text-xs text-gray-500">[{feature.refNum}]</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(feature.status)}`}>
                    {FeatureStatusDisplay[feature.status as keyof typeof FeatureStatusDisplay]}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(feature.priority)}`}>
                    {feature.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pb-3 border-b border-gray-200 mb-5">
              <div className="relative">
                <select
                  value={feature.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition appearance-none pr-8"
                >
                  <option value={FeatureStatus.OPEN}>Open</option>
                  <option value={FeatureStatus.ASSIGNED}>Assigned</option>
                  <option value={FeatureStatus.IN_PROGRESS}>In Progress</option>
                  <option value={FeatureStatus.IN_REVIEW}>In Review</option>
                  <option value={FeatureStatus.COMPLETED}>Completed</option>
                  <option value={FeatureStatus.CLOSED}>Closed</option>
                </select>
                <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              <button
                onClick={() => setEditingFeature(feature)}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Edit
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  onBlur={() => setTimeout(() => setShowDeleteMenu(false), 200)}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                  title="More actions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {showDeleteMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        setShowDeleteMenu(false)
                        handleDelete()
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded transition"
                    >
                      Delete Feature
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <div 
                className="text-sm text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: feature.description || '<p class="text-gray-500 italic">No description provided</p>' 
                }}
              />
            </div>

            {/* Feature Details */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Feature Details</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {feature.assignedTo && (
                  <div>
                    <span className="text-gray-500">Assignee:</span>
                    <span className="ml-2 text-gray-900"><UserLabel userId={feature.assignedTo} /></span>
                  </div>
                )}
                {feature.points > 0 && (
                  <div>
                    <span className="text-gray-500">Points:</span>
                    <span className="ml-2 text-gray-900">{feature.points}</span>
                  </div>
                )}
                {feature.deadline && (
                  <div className="col-span-2">
                    {formatDeadline(feature.deadline)}
                  </div>
                )}
                {feature.sprintId && (
                  <div>
                    <span className="text-gray-500">Sprint ID:</span>
                    <span className="ml-2 text-gray-900">{feature.sprintId}</span>
                  </div>
                )}
                {feature.itemType && feature.itemId && (
                  <div className="col-span-2">
                    <ItemLink itemType={feature.itemType} itemId={feature.itemId} />
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {feature.tags && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {feature.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Information</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Created by:</span>
                  <span className="ml-2 text-gray-900"><UserLabel userId={feature.createdBy} /></span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(feature.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(feature.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Tasks Section */}
            <RelatedTasks 
              projectId={projectIdNum} 
              itemType="features" 
              itemId={feature.id}
              itemRefNum={feature.refNum}
              itemTitle={feature.title}
              itemPriority={feature.priority}
            />

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <Comments itemId={feature.id} itemType="features" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
