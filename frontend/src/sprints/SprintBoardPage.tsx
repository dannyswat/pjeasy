import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGetSprintBoard } from './useGetSprintBoard'
import { useGetSprintSwimlane } from './useGetSprintSwimlane'
import { useUpdateTaskStatus } from '../tasks/useUpdateTaskStatus'
import { useGetProject } from '../projects/useGetProject'
import { TaskStatus, TaskStatusDisplay, TaskPriority, type TaskResponse } from '../tasks/taskTypes'
import { SprintStatus, SprintStatusDisplay } from './sprintTypes'
import { UserLabel } from '../components/UserLabel'

type ViewMode = 'board' | 'swimlane'

// Status columns order for the board view
const statusColumns = [
  TaskStatus.OPEN,
  TaskStatus.IN_PROGRESS,
  TaskStatus.ON_HOLD,
  TaskStatus.BLOCKED,
  TaskStatus.COMPLETED,
  TaskStatus.CLOSED,
]

export default function SprintBoardPage() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [draggingTask, setDraggingTask] = useState<TaskResponse | null>(null)

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const sprintIdNum = sprintId ? parseInt(sprintId) : 0

  const { sprint, tasksByStatus, isLoading: isBoardLoading, refetch: refetchBoard } = useGetSprintBoard({ sprintId: sprintIdNum })
  const { tasksByAssignee, unassignedTasks, isLoading: isSwimlaneLoading, refetch: refetchSwimlane } = useGetSprintSwimlane({ sprintId: sprintIdNum })
  const { members } = useGetProject(projectIdNum)
  const updateTaskStatus = useUpdateTaskStatus()

  const isLoading = viewMode === 'board' ? isBoardLoading : isSwimlaneLoading

  const refetch = () => {
    refetchBoard()
    refetchSwimlane()
  }

  if (!projectId || !sprintId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">Invalid Sprint</h3>
          <p className="text-yellow-700 mb-4">Please select a valid sprint to view the board.</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/sprints`)}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Go to Sprints
          </button>
        </div>
      </div>
    )
  }

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

  const renderBoardView = () => (
    <div className="grid grid-cols-6 gap-4 overflow-x-auto pb-4">
      {statusColumns.map((status) => {
        const tasks = tasksByStatus[status] || []
        return (
          <div
            key={status}
            className="flex flex-col min-w-50"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            <div className={`${getStatusColor(status)} text-white px-3 py-2 rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{TaskStatusDisplay[status as keyof typeof TaskStatusDisplay]}</span>
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
  )

  const renderSwimlaneView = () => {
    const assigneeIds = Object.keys(tasksByAssignee).map(Number)
    
    return (
      <div className="space-y-6">
        {/* Unassigned Tasks */}
        {unassignedTasks.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <span className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-2 text-xs">?</span>
              Unassigned
              <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded text-xs">{unassignedTasks.length}</span>
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {statusColumns.map((status) => {
                const tasks = unassignedTasks.filter(t => t.status === status)
                return (
                  <div
                    key={`unassigned-${status}`}
                    className="min-h-25 bg-white rounded p-2 space-y-2"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(status)}
                  >
                    <div className={`text-xs font-medium ${getStatusColor(status)} text-white px-2 py-1 rounded text-center mb-2`}>
                      {TaskStatusDisplay[status as keyof typeof TaskStatusDisplay]}
                    </div>
                    {tasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tasks by Assignee */}
        {assigneeIds.map((assigneeId) => {
          const memberTasks = tasksByAssignee[assigneeId] || []
          const member = members.find(m => m.userId === assigneeId)
          
          return (
            <div key={assigneeId} className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 text-xs font-bold text-indigo-700">
                  {member?.user.name?.charAt(0).toUpperCase() || '?'}
                </span>
                {member?.user.name || <UserLabel userId={assigneeId} />}
                <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded text-xs">{memberTasks.length}</span>
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {statusColumns.map((status) => {
                  const tasks = memberTasks.filter(t => t.status === status)
                  return (
                    <div
                      key={`${assigneeId}-${status}`}
                      className="min-h-25 bg-white rounded p-2 space-y-2"
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(status)}
                    >
                      {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/projects/${projectId}/sprints`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{sprint?.name || 'Sprint Board'}</h1>
            {sprint && (
              <div className="flex items-center space-x-3 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  sprint.status === SprintStatus.ACTIVE 
                    ? 'bg-green-100 text-green-800' 
                    : sprint.status === SprintStatus.PLANNING
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {SprintStatusDisplay[sprint.status as keyof typeof SprintStatusDisplay]}
                </span>
                {sprint.startDate && (
                  <span className="text-sm text-gray-500">
                    {sprint.startDate} {sprint.endDate ? `- ${sprint.endDate}` : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('board')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              viewMode === 'board'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Board
            </span>
          </button>
          <button
            onClick={() => setViewMode('swimlane')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              viewMode === 'swimlane'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Swimlane
            </span>
          </button>
        </div>
      </div>

      {/* Sprint Goal */}
      {sprint?.goal && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-indigo-900 mb-1">Sprint Goal</h3>
          <p className="text-indigo-700">{sprint.goal}</p>
        </div>
      )}

      {/* Board Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        viewMode === 'board' ? renderBoardView() : renderSwimlaneView()
      )}
    </div>
  )
}
