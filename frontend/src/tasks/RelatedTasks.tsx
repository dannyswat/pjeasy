import { useState } from 'react'
import { useListTasksByItem } from './useListTasksByItem'
import { useCreateTask } from './useCreateTask'
import { useUpdateTaskStatus } from './useUpdateTaskStatus'
import { type TaskResponse, TaskStatusDisplay } from './taskTypes'
import CreateTaskForm from './CreateTaskForm'
import { UserLabel } from '../components/UserLabel'

interface RelatedTasksProps {
  projectId: number
  itemType: string
  itemId: number
  itemRefNum?: string
  itemTitle?: string
  itemPriority?: string
  onTaskCreated?: () => void
}

// Predefined task templates for ideas
const IDEA_TASK_TEMPLATES = [
  { title: 'Gather requirements', description: 'Collect and document detailed requirements for this idea' },
  { title: 'System design', description: 'Create system design and architecture for implementing this idea' },
  { title: 'Define features', description: 'Break down this idea into specific features and user stories' },
  { title: 'Research feasibility', description: 'Research technical feasibility and potential challenges' },
  { title: 'Create prototype', description: 'Build a prototype or proof of concept' },
  { title: 'Review and approve', description: 'Review the idea with stakeholders and get approval' },
]

// Predefined task templates for issues
const ISSUE_TASK_TEMPLATES = [
  { title: 'Fix issue', description: 'Implement the fix for this issue' },
  { title: 'Validate fixes', description: 'Test and validate that the issue has been resolved' },
]

export default function RelatedTasks({ projectId, itemType, itemId, itemRefNum, itemTitle, itemPriority, onTaskCreated }: RelatedTasksProps) {
  // Select templates based on item type (no templates for service-tickets)
  const templates = itemType === 'issues' ? ISSUE_TASK_TEMPLATES : itemType === 'ideas' ? IDEA_TASK_TEMPLATES : []
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<{ title: string; description: string } | null>(null)
  const { tasks, isLoading, refetch } = useListTasksByItem({ projectId, itemType, itemId, pageSize: 50 })
  const createTask = useCreateTask()
  const updateTaskStatus = useUpdateTaskStatus()

  const handleSelectTemplate = (template: { title: string; description: string }) => {
    // Prepend item reference to task title
    const taskTitle = itemRefNum && itemTitle 
      ? `[${itemRefNum}] ${template.title} - ${itemTitle}`
      : template.title
    
    setSelectedTemplate({
      title: taskTitle,
      description: template.description,
    })
    setShowCreateDropdown(false)
    setShowCreateModal(true)
  }

  const handleDirectCreate = () => {
    // For service tickets - open modal directly without template
    const taskTitle = itemRefNum && itemTitle 
      ? `[${itemRefNum}] Follow-up: ${itemTitle}`
      : 'Follow-up task'
    
    setSelectedTemplate({
      title: taskTitle,
      description: '',
    })
    setShowCreateModal(true)
  }

  const handleCreateTask = async (data: {
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
        projectId,
        title: data.title,
        description: data.description,
        itemType,
        itemId,
        assigneeId: data.assigneeId,
        deadline: data.deadline,
        status: 'Open',
        priority: data.priority,
        estimatedHours: data.estimatedHours,
        tags: data.tags,
      })
      setShowCreateModal(false)
      setSelectedTemplate(null)
      refetch()
      onTaskCreated?.()
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleToggleStatus = async (task: TaskResponse) => {
    const newStatus = task.status === 'Open' ? 'Completed' : 'Open'
    try {
      await updateTaskStatus.mutateAsync({
        taskId: task.id,
        projectId,
        status: newStatus,
      })
      refetch()
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'InProgress':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Blocked':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Related Tasks</h3>
        <div className="relative">
          <button
            onClick={() => templates.length > 0 ? setShowCreateDropdown(!showCreateDropdown) : handleDirectCreate()}
            onBlur={() => setTimeout(() => setShowCreateDropdown(false), 200)}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Task
          </button>

          {showCreateDropdown && (
            <div className="absolute right-0 mt-1 w-80 bg-white rounded shadow-lg border border-gray-200 z-20 p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Create from template:</h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {templates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-indigo-50 rounded transition border border-transparent hover:border-indigo-200"
                  >
                    <div className="font-medium">{template.title}</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && selectedTemplate && (
        <CreateTaskForm
          projectId={projectId}
          defaultTitle={selectedTemplate.title}
          defaultDescription={selectedTemplate.description}
          defaultPriority={itemPriority}
          onSubmit={handleCreateTask}
          onCancel={() => {
            setShowCreateModal(false)
            setSelectedTemplate(null)
          }}
          isPending={createTask.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
          <p className="text-xs text-gray-500">No related tasks yet. Create one using the button above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-gray-50 border border-gray-200 rounded p-3 hover:bg-gray-100 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <button
                      onClick={() => handleToggleStatus(task)}
                      disabled={updateTaskStatus.isPending}
                      className="shrink-0"
                    >
                      {task.status === 'Completed' ? (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                    </button>
                    <h4 className={`text-sm font-medium ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </h4>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-600 ml-7">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  {task.assigneeId && (
                    <span className="text-xs text-gray-600">
                      👤 <UserLabel userId={task.assigneeId} />
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(task.status)}`}>
                    {TaskStatusDisplay[task.status as keyof typeof TaskStatusDisplay]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
