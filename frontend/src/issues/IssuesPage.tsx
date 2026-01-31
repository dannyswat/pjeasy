import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListIssues } from './useListIssues'
import { useUpdateIssue } from './useUpdateIssue'
import { useDeleteIssue } from './useDeleteIssue'
import { useCreateIssue } from './useCreateIssue'
import { IssueStatus, IssuePriority, IssueStatusDisplay, type IssueResponse } from './issueTypes'
import EditIssueForm from './EditIssueForm'
import CreateIssueForm from './CreateIssueForm'
import { UserLabel } from '../components/UserLabel'

// Default statuses exclude Completed and Closed
const defaultStatuses = [
  IssueStatus.OPEN,
  IssueStatus.ASSIGNED,
  IssueStatus.IN_PROGRESS,
  IssueStatus.IN_REVIEW,
]

export default function IssuesPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string[]>(defaultStatuses)
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [editingIssue, setEditingIssue] = useState<IssueResponse | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { issues, total, isLoading, refetch } = useListIssues({ 
    projectId: projectIdNum, 
    page, 
    pageSize, 
    status: statusFilter.length > 0 ? statusFilter : undefined,
    priority: priorityFilter 
  })
  const updateIssue = useUpdateIssue()
  const deleteIssue = useDeleteIssue()
  const createIssue = useCreateIssue()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleDelete = async (issueId: number) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return

    try {
      await deleteIssue.mutateAsync({
        issueId,
        projectId: projectIdNum,
      })
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

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status)
      } else {
        return [...prev, status]
      }
    })
    setPage(1)
  }

  const allStatuses = Object.values(IssueStatus)
  const statusFilterLabel = statusFilter.length === 0 
    ? 'All' 
    : statusFilter.length === allStatuses.length 
      ? 'All' 
      : `${statusFilter.length} selected`

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-600 mt-1">Track and resolve project issues</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition flex items-center"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Issue
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center space-x-3">
        <label className="text-xs font-medium text-gray-700">Status:</label>
        <div className="relative" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-transparent min-w-[120px] text-left flex items-center justify-between"
          >
            <span>{statusFilterLabel}</span>
            <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showStatusDropdown && (
            <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="p-2 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter(allStatuses)
                    setPage(1)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 mr-3"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter([])
                    setPage(1)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              </div>
              <div className="py-1 max-h-60 overflow-y-auto">
                {allStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(status)}
                      onChange={() => toggleStatusFilter(status)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {IssueStatusDisplay[status] || status}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

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
                    onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`)}
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
          )
      }

      {/* Create Modal */}
      {showCreateModal && (
        <CreateIssueForm
          projectId={projectIdNum}
          onCancel={() => setShowCreateModal(false)}
          isPending={createIssue.isPending}
          onSubmit={async (data) => {
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
          }}
        />
      )}

      {/* Edit Modal */}
      {editingIssue && (
        <EditIssueForm
          issue={editingIssue!}
          onSubmit={async (data) => {
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
          }}
          onCancel={() => setEditingIssue(null)}
          isPending={updateIssue.isPending}
        />
      )}
    </div>
  )
}
