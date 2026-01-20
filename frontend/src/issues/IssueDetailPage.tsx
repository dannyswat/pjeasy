import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSecureApi } from '../apis/fetch'
import { useUpdateIssueStatus } from './useUpdateIssueStatus'
import { useDeleteIssue } from './useDeleteIssue'
import { IssueStatus, IssueStatusDisplay, type IssueResponse } from './issueTypes'
import EditIssueForm from './EditIssueForm'
import Comments from '../comments/Comments'
import RelatedTasks from '../tasks/RelatedTasks'
import { UserLabel } from '../components/UserLabel'
import { useUpdateIssue } from './useUpdateIssue'

export default function IssueDetailPage() {
  const { projectId, issueId } = useParams<{ projectId: string; issueId: string }>()
  const navigate = useNavigate()
  const [issue, setIssue] = useState<IssueResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingIssue, setEditingIssue] = useState<IssueResponse | null>(null)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const issueIdNum = issueId ? parseInt(issueId) : 0
  const updateIssueStatus = useUpdateIssueStatus()
  const deleteIssue = useDeleteIssue()
  const updateIssue = useUpdateIssue()

  const fetchIssue = async () => {
    try {
      setIsLoading(true)
      const data = await getSecureApi<IssueResponse>(
        `/api/issues/${issueIdNum}`
      )
      setIssue(data)
    } catch (error) {
      console.error('Failed to fetch issue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIssue()
  }, [projectIdNum, issueIdNum])

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

  const handleStatusChange = async (status: string) => {
    if (!issue) return

    try {
      await updateIssueStatus.mutateAsync({
        issueId: issue.id,
        projectId: projectIdNum,
        status,
      })
      fetchIssue()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async () => {
    if (!issue || !window.confirm('Are you sure you want to delete this issue?')) return

    try {
      await deleteIssue.mutateAsync({
        issueId: issue.id,
        projectId: projectIdNum,
      })
      navigate(`/projects/${projectId}/issues`)
    } catch (error) {
      console.error('Failed to delete issue:', error)
    }
  }

  const handleUpdateSubmit = async (data: {
    title: string
    description: string
    priority: string
    assignedTo?: number
    points: number
    tags: string
  }) => {
    if (!editingIssue) return

    try {
      await updateIssue.mutateAsync({
        issueId: editingIssue.id,
        projectId: projectIdNum,
        ...data,
      })
      setEditingIssue(null)
      fetchIssue()
    } catch (error) {
      console.error('Failed to update issue:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 flex justify-center items-center min-h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">Issue Not Found</h3>
          <button
            onClick={() => navigate(`/projects/${projectId}/issues`)}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Back to Issues
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {editingIssue ? (
        <EditIssueForm
          issue={editingIssue}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setEditingIssue(null)}
          isPending={updateIssue.isPending}
        />
      ) : (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/projects/${projectId}/issues`)}
            className="flex items-center text-red-600 hover:text-red-700 transition text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Issues
          </button>

          {/* Issue Detail */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h1 className="text-xl font-semibold text-gray-900">{issue.title}</h1>
                  <span className="text-xs text-gray-500">[{issue.refNum}]</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(issue.status)}`}>
                    {IssueStatusDisplay[issue.status as keyof typeof IssueStatusDisplay]}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(issue.priority)}`}>
                    {issue.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pb-3 border-b border-gray-200 mb-5">
              <div className="relative">
                <select
                  value={issue.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition appearance-none pr-8"
                >
                  <option value={IssueStatus.OPEN}>Open</option>
                  <option value={IssueStatus.ASSIGNED}>Assigned</option>
                  <option value={IssueStatus.IN_PROGRESS}>In Progress</option>
                  <option value={IssueStatus.IN_REVIEW}>In Review</option>
                  <option value={IssueStatus.COMPLETED}>Completed</option>
                  <option value={IssueStatus.CLOSED}>Closed</option>
                </select>
                <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              <button
                onClick={() => setEditingIssue(issue)}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
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
                      Delete Issue
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
                  __html: issue.description || '<p class="text-gray-500 italic">No description provided</p>' 
                }}
              />
            </div>

            {/* Issue Details */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Issue Details</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {issue.assignedTo && (
                  <div>
                    <span className="text-gray-500">Assignee:</span>
                    <span className="ml-2 text-gray-900"><UserLabel userId={issue.assignedTo} /></span>
                  </div>
                )}
                {issue.points > 0 && (
                  <div>
                    <span className="text-gray-500">Points:</span>
                    <span className="ml-2 text-gray-900">{issue.points}</span>
                  </div>
                )}
                {issue.sprintId && (
                  <div>
                    <span className="text-gray-500">Sprint ID:</span>
                    <span className="ml-2 text-gray-900">{issue.sprintId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {issue.tags && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {issue.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded">
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
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(issue.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(issue.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Tasks Section */}
            <RelatedTasks 
              projectId={projectIdNum} 
              itemType="issues" 
              itemId={issue.id}
              itemRefNum={issue.refNum}
              itemTitle={issue.title}
              itemPriority={issue.priority}
            />

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <Comments itemId={issue.id} itemType="issues" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
