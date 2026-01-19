import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListIssues } from './useListIssues'
import { useCreateIssue } from './useCreateIssue'
import { useUpdateIssue } from './useUpdateIssue'
import { useUpdateIssueStatus } from './useUpdateIssueStatus'
import { useDeleteIssue } from './useDeleteIssue'
import { IssueStatus, IssuePriority, IssueStatusDisplay, type IssueResponse } from './issueTypes'
import CreateIssueForm from './CreateIssueForm'
import EditIssueForm from './EditIssueForm'
import Comments from '../comments/Comments'
import { UserLabel } from '../components/UserLabel'

export default function IssuesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingIssue, setEditingIssue] = useState<IssueResponse | null>(null)
  const [viewingIssue, setViewingIssue] = useState<IssueResponse | null>(null)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { issues, total, isLoading, refetch } = useListIssues({ 
    projectId: projectIdNum, 
    page, 
    pageSize, 
    status: statusFilter,
    priority: priorityFilter 
  })
  const createIssue = useCreateIssue()
  const updateIssue = useUpdateIssue()
  const updateIssueStatus = useUpdateIssueStatus()
  const deleteIssue = useDeleteIssue()

  const totalPages = Math.ceil(total / pageSize)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view and manage issues.</p>
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
    title: string
    description: string
    priority: string
    assignedTo?: number
    points: number
    tags: string 
  }) => {
    try {
      await createIssue.mutateAsync({
        projectId: projectIdNum,
        ...data,
      })
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to create issue:', error)
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
      refetch()
    } catch (error) {
      console.error('Failed to update issue:', error)
    }
  }

  const handleStatusChange = async (issueId: number, status: string) => {
    try {
      await updateIssueStatus.mutateAsync({
        issueId,
        projectId: projectIdNum,
        status,
      })
      setViewingIssue(null)
      refetch()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async (issueId: number) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return

    try {
      await deleteIssue.mutateAsync({
        issueId,
        projectId: projectIdNum,
      })
      setViewingIssue(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete issue:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case IssuePriority.IMMEDIATE:
        return 'bg-red-100 text-red-800 border-red-300'
      case IssuePriority.URGENT:
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case IssuePriority.HIGH:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case IssuePriority.NORMAL:
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case IssuePriority.LOW:
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case IssueStatus.OPEN:
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case IssueStatus.ASSIGNED:
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case IssueStatus.IN_PROGRESS:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case IssueStatus.IN_REVIEW:
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case IssueStatus.COMPLETED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case IssueStatus.CLOSED:
        return 'bg-gray-50 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Show issue detail as full page */}
      {viewingIssue ? (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => setViewingIssue(null)}
            className="flex items-center text-indigo-600 hover:text-indigo-700 transition text-sm font-medium"
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
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-gray-900">{viewingIssue.title}</h1>
                  <span className="text-xs text-gray-500">[{viewingIssue.refNum}]</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(viewingIssue.status)}`}>
                    {IssueStatusDisplay[viewingIssue.status]}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(viewingIssue.priority)}`}>
                    {viewingIssue.priority}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pb-3 border-b border-gray-200 mb-5">
              <div className="relative">
                <select
                  value={viewingIssue.status}
                  onChange={(e) => handleStatusChange(viewingIssue.id, e.target.value)}
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
                onClick={() => {
                  setEditingIssue(viewingIssue)
                  setViewingIssue(null)
                }}
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
                        handleDelete(viewingIssue.id)
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
                  __html: viewingIssue.description || '<p class="text-gray-500 italic">No description provided</p>' 
                }}
              />
            </div>

            {/* Issue Details */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Issue Details</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {viewingIssue.assignedTo && (
                  <div>
                    <span className="text-gray-500">Assignee:</span>
                    <span className="ml-2 text-gray-900"><UserLabel userId={viewingIssue.assignedTo} /></span>
                  </div>
                )}
                {viewingIssue.points > 0 && (
                  <div>
                    <span className="text-gray-500">Points:</span>
                    <span className="ml-2 text-gray-900">{viewingIssue.points}</span>
                  </div>
                )}
                {viewingIssue.sprintId && (
                  <div>
                    <span className="text-gray-500">Sprint ID:</span>
                    <span className="ml-2 text-gray-900">{viewingIssue.sprintId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {viewingIssue.tags && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingIssue.tags.split(',').map((tag, idx) => (
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
                    {new Date(viewingIssue.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(viewingIssue.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-4">
              <Comments itemId={viewingIssue.id} itemType="issues" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Issues</h1>
            <p className="text-sm text-gray-600 mt-1">Track and resolve project issues</p>
          </div>

          {/* Create Button */}
          <div className="mb-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Issue
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
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value={IssueStatus.OPEN}>Open</option>
              <option value={IssueStatus.ASSIGNED}>Assigned</option>
              <option value={IssueStatus.IN_PROGRESS}>In Progress</option>
              <option value={IssueStatus.IN_REVIEW}>In Review</option>
              <option value={IssueStatus.COMPLETED}>Completed</option>
              <option value={IssueStatus.CLOSED}>Closed</option>
            </select>

            <label className="text-xs font-medium text-gray-700">Priority:</label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value={IssuePriority.IMMEDIATE}>Immediate</option>
              <option value={IssuePriority.URGENT}>Urgent</option>
              <option value={IssuePriority.HIGH}>High</option>
              <option value={IssuePriority.NORMAL}>Normal</option>
              <option value={IssuePriority.LOW}>Low</option>
            </select>
          </div>

          {/* Issues List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <p className="mt-3 text-sm text-gray-600">Loading issues...</p>
              </div>
            </div>
          ) : issues.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="mt-3 text-base font-medium text-gray-900">No issues yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first issue.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded border border-gray-200 divide-y divide-gray-200">
                {issues.map((issue) => (
                  <div 
                    key={issue.id} 
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition group cursor-pointer"
                    onClick={() => setViewingIssue(issue)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">[{issue.refNum}]</span>
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-red-600 transition">
                          {issue.title}
                        </h3>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getStatusColor(issue.status)}`}>
                          {IssueStatusDisplay[issue.status]}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getPriorityColor(issue.priority)}`}>
                          {issue.priority}
                        </span>
                        {issue.points > 0 && (
                          <span className="text-xs text-gray-500">
                            {issue.points} pts
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-3">
                      {issue.assignedTo && (
                        <span className="text-xs text-gray-600">
                          👤 <UserLabel userId={issue.assignedTo} />
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingIssue(issue)
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(issue.id)
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} issues
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateIssueForm
          projectId={projectIdNum}
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
          isPending={createIssue.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingIssue && (
        <EditIssueForm
          issue={editingIssue}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setEditingIssue(null)}
          isPending={updateIssue.isPending}
        />
      )}
    </div>
  )
}
