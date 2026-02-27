import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGetActiveSprint } from './useGetActiveSprint'
import { useGetSprintBoard } from './useGetSprintBoard'
import { useUpdateTaskStatus } from '../tasks/useUpdateTaskStatus'
import { TaskStatus, TaskStatusDisplay, TaskPriority, type TaskResponse } from '../tasks/taskTypes'
import { SprintStatusDisplay } from './sprintTypes'
import { UserLabel } from '../components/UserLabel'

const statusColumns = [
  TaskStatus.OPEN,
  TaskStatus.IN_PROGRESS,
  TaskStatus.ON_HOLD,
  TaskStatus.BLOCKED,
  TaskStatus.COMPLETED,
  TaskStatus.CLOSED,
]

export default function SprintDefaultPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [draggingTask, setDraggingTask] = useState<TaskResponse | null>(null)

  const projectIdNum = projectId ? parseInt(projectId) : 0

  const { sprint: activeSprint, isLoading: isLoadingActive } = useGetActiveSprint({ projectId: projectIdNum })
  const { sprint, tasksByStatus, isLoading: isLoadingBoard, refetch } = useGetSprintBoard({
    sprintId: activeSprint?.id ?? 0,
  })
  const updateTaskStatus = useUpdateTaskStatus()

  const isLoading = isLoadingActive || (activeSprint && isLoadingBoard)

  const handleDragStart = (task: TaskResponse) => {
    setDraggingTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggingTask || draggingTask.status === newStatus) {
      setDraggingTask(null)
      return
    }

    try {
      await updateTaskStatus.mutateAsync({
        taskId: draggingTask.id,
        projectId: projectIdNum,
        status: newStatus,
      })
      refetch()
    } catch (error) {
      console.error('Failed to update task status:', error)
    } finally {
      setDraggingTask(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case TaskStatus.OPEN:
        return 'bg-blue-500'
      case TaskStatus.IN_PROGRESS:
        return 'bg-yellow-500'
      case TaskStatus.ON_HOLD:
        return 'bg-orange-500'
      case TaskStatus.BLOCKED:
        return 'bg-red-500'
      case TaskStatus.COMPLETED:
        return 'bg-emerald-500'
      case TaskStatus.CLOSED:
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case TaskPriority.IMMEDIATE:
        return 'border-l-4 border-l-red-500'
      case TaskPriority.URGENT:
        return 'border-l-4 border-l-orange-500'
      case TaskPriority.HIGH:
        return 'border-l-4 border-l-yellow-500'
      case TaskPriority.NORMAL:
        return 'border-l-4 border-l-blue-500'
      case TaskPriority.LOW:
        return 'border-l-4 border-l-gray-400'
      default:
        return ''
    }
  }

  const TaskCard = ({ task }: { task: TaskResponse }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(task)}
      className={`bg-white rounded-lg shadow-sm border p-3 cursor-move hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}
    >
      <Link
        to={`/projects/${projectId}/tasks`}
        onClick={(e) => e.stopPropagation()}
        className="text-sm font-medium text-gray-900 hover:text-indigo-600 block mb-2"
      >
        {task.title}
      </Link>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{task.priority}</span>
        {task.assigneeId && (
          <span className="flex items-center">
            <UserLabel userId={task.assigneeId} />
          </span>
        )}
      </div>
    </div>
  )

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 md:px-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view sprints.</p>
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

  return (
    <div className="max-w-full mx-auto p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeSprint ? activeSprint.name : 'Sprint Board'}
          </h1>
          {activeSprint && (
            <div className="flex items-center space-x-3 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {SprintStatusDisplay[activeSprint.status as keyof typeof SprintStatusDisplay]}
              </span>
              {activeSprint.startDate && (
                <span className="text-sm text-gray-500">
                  {activeSprint.startDate}
                  {activeSprint.endDate ? ` - ${activeSprint.endDate}` : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(`/projects/${projectId}/sprints/list`)}
          className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition flex items-center text-sm"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          All Sprints
        </button>
      </div>

      {/* Sprint Goal */}
      {sprint?.goal && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-indigo-900 mb-1">Sprint Goal</h3>
          <p className="text-indigo-700">{sprint.goal}</p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : !activeSprint ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sprint</h3>
          <p className="text-gray-600 mb-4">Start a sprint to see its board here.</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/sprints/list`)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Go to Sprint List
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4">
            {statusColumns.map((status) => {
              const tasks = tasksByStatus[status] || []
              return (
                <div
                  key={status}
                  className="shrink-0 w-64 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(status)}
                >
                  <div className={`${getStatusColor(status)} text-white px-3 py-2 rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {TaskStatusDisplay[status as keyof typeof TaskStatusDisplay]}
                      </span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{tasks.length}</span>
                    </div>
                  </div>
                  <div className="bg-gray-100 p-2 rounded-b-lg flex-1 min-h-75 space-y-2">
                    {tasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
