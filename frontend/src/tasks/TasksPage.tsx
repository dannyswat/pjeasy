import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListTasks } from './useListTasks'
import { useCreateTask } from './useCreateTask'
import { useUpdateTask } from './useUpdateTask'
import { useUpdateTaskStatus } from './useUpdateTaskStatus'
import { useDeleteTask } from './useDeleteTask'
import { TaskStatus, TaskStatusDisplay, TaskPriority, type TaskResponse } from './taskTypes'
import CreateTaskForm from './CreateTaskForm'
import EditTaskForm from './EditTaskForm'
import Comments from '../comments/Comments'
import { UserLabel } from '../components/UserLabel'

export default function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null)
  const [viewingTask, setViewingTask] = useState<TaskResponse | null>(null)
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { tasks, total, isLoading, refetch } = useListTasks({ projectId: projectIdNum, page, pageSize, status: statusFilter })
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const updateTaskStatus = useUpdateTaskStatus()
  const deleteTask = useDeleteTask()

  const totalPages = Math.ceil(total / pageSize)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view and manage tasks.</p>
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

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCreateTitle.trim()) return

    try {
      await createTask.mutateAsync({
        projectId: projectIdNum,
        title: quickCreateTitle,
        description: '',
        tags: '',
      })
      setQuickCreateTitle('')
      refetch()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleCreateSubmit = async (data: { 
    title: string
    description: string
    priority: string
    estimatedHours?: number
    assigneeId?: number
    deadline?: string
    tags: string 
  }) => {
    try {
      await createTask.mutateAsync({
        projectId: projectIdNum,
        ...data,
      })
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleUpdateSubmit = async (data: {
    title: string
    description: string
    priority: string
    estimatedHours?: number
    assigneeId?: number
    deadline?: string
    tags: string
  }) => {
    if (!editingTask) return

    try {
      await updateTask.mutateAsync({
        taskId: editingTask.id,
        projectId: projectIdNum,
        ...data,
      })
      setEditingTask(null)
      refetch()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await updateTaskStatus.mutateAsync({
        taskId,
        projectId: projectIdNum,
        status,
      })
      setViewingTask(null)
      refetch()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    try {
      await deleteTask.mutateAsync({
        taskId,
      })
      setViewingTask(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case TaskStatus.OPEN:
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case TaskStatus.IN_PROGRESS:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case TaskStatus.ON_HOLD:
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case TaskStatus.BLOCKED:
        return 'bg-red-50 text-red-700 border-red-200'
      case TaskStatus.COMPLETED:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case TaskStatus.CLOSED:
        return 'bg-gray-50 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case TaskPriority.IMMEDIATE:
        return 'bg-red-100 text-red-800 border-red-300'
      case TaskPriority.URGENT:
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case TaskPriority.HIGH:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case TaskPriority.NORMAL:
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case TaskPriority.LOW:
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Show task detail as full page */}
      {viewingTask ? (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => setViewingTask(null)}
            className="flex items-center text-indigo-600 hover:text-indigo-700 transition text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tasks
          </button>

          {/* Task Detail */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            
            <div className="mb-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-gray-900">{viewingTask.title}</h1>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(viewingTask.status)}`}>
                    {TaskStatusDisplay[viewingTask.status as keyof typeof TaskStatusDisplay]}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(viewingTask.priority)}`}>
                    {viewingTask.priority}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pb-3 border-b border-gray-200 mb-5">
              <div className="relative">
                <select
                  value={viewingTask.status}
                  onChange={(e) => handleStatusChange(viewingTask.id, e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition appearance-none pr-8"
                >
                  <option value={TaskStatus.OPEN}>Open</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.ON_HOLD}>On Hold</option>
                  <option value={TaskStatus.BLOCKED}>Blocked</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                  <option value={TaskStatus.CLOSED}>Closed</option>
                </select>
                <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              <button
                onClick={() => {
                  setEditingTask(viewingTask)
                  setViewingTask(null)
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
                        handleDelete(viewingTask.id)
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded transition"
                    >
                      Delete Task
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
                  __html: viewingTask.description || '<p class="text-gray-500 italic">No description provided</p>' 
                }}
              />
            </div>

            {/* Task Details */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Task Details</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {viewingTask.estimatedHours > 0 && (
                  <div>
                    <span className="text-gray-500">Estimated Hours:</span>
                    <span className="ml-2 text-gray-900">{viewingTask.estimatedHours}h</span>
                  </div>
                )}
                {viewingTask.assigneeId && (
                  <div>
                    <span className="text-gray-500">Assignee:</span>
                    <span className="ml-2 text-gray-900"><UserLabel userId={viewingTask.assigneeId} /></span>
                  </div>
                )}
                {viewingTask.deadline && (
                  <div>
                    <span className="text-gray-500">Deadline:</span>
                    <span className="ml-2 text-gray-900">{viewingTask.deadline}</span>
                  </div>
                )}
                {viewingTask.sprintId && (
                  <div>
                    <span className="text-gray-500">Sprint ID:</span>
                    <span className="ml-2 text-gray-900">{viewingTask.sprintId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {viewingTask.tags && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingTask.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
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
                    {new Date(viewingTask.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(viewingTask.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-4">
              <Comments itemId={viewingTask.id} itemType="tasks" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-600 mt-1">Manage project tasks and track progress</p>
          </div>

          {/* Quick Create */}
          <div className="mb-4">
            <form onSubmit={handleQuickCreate} className="flex gap-2">
              <input
                type="text"
                value={quickCreateTitle}
                onChange={(e) => setQuickCreateTitle(e.target.value)}
                placeholder="Type a task and press Enter to add quickly..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!quickCreateTitle.trim() || createTask.isPending}
                className="px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Detailed
              </button>
            </form>
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
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value={TaskStatus.OPEN}>Open</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.ON_HOLD}>On Hold</option>
              <option value={TaskStatus.BLOCKED}>Blocked</option>
              <option value={TaskStatus.COMPLETED}>Completed</option>
              <option value={TaskStatus.CLOSED}>Closed</option>
            </select>
          </div>

          {/* Tasks List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-3 text-sm text-gray-600">Loading tasks...</p>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="mt-3 text-base font-medium text-gray-900">No tasks yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first task.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded border border-gray-200 divide-y divide-gray-200">
                {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition group"
                  >
                    <div 
                      className="flex-1 cursor-pointer" 
                      onClick={() => setViewingTask(task)}
                    >
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition">
                          <span>{task.title}</span>
                        </h3>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getStatusColor(task.status)}`}>
                          {TaskStatusDisplay[task.status as keyof typeof TaskStatusDisplay]}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.estimatedHours > 0 && (
                          <span className="text-xs text-gray-500">
                            {task.estimatedHours}h
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-3">
                      {task.assigneeId && (
                        <span className="text-xs text-gray-600">
                          👤 <UserLabel userId={task.assigneeId} />
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTask(task)
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(task.id)
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
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} tasks
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded">
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
        <CreateTaskForm
          projectId={projectIdNum}
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
          isPending={createTask.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingTask && (
        <EditTaskForm
          task={editingTask}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setEditingTask(null)}
          isPending={updateTask.isPending}
        />
      )}
    </div>
  )
}
