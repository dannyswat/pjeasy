import { useState } from 'react'
import type { FormEvent } from 'react'
import TagsInput from '../components/TagsInput'
import HtmlEditor from '../components/HtmlEditor'
import ProjectMemberSelect from '../components/ProjectMemberSelect'
import { TaskPriority } from './taskTypes'

interface CreateTaskFormProps {
  projectId: number
  defaultTitle?: string
  defaultDescription?: string
  onSubmit: (data: {
    title: string
    description: string
    priority: string
    estimatedHours?: number
    assigneeId?: number
    deadline?: string
    tags: string
  }) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

export default function CreateTaskForm({ projectId, defaultTitle = '', defaultDescription = '', onSubmit, onCancel, isPending }: CreateTaskFormProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [priority, setPriority] = useState<string>(TaskPriority.NORMAL)
  const [estimatedHours, setEstimatedHours] = useState('')
  const [assigneeId, setAssigneeId] = useState<number | undefined>()
  const [deadline, setDeadline] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSubmit({
      title,
      description,
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      assigneeId,
      deadline: deadline || undefined,
      tags: tags.join(','),
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <HtmlEditor
              value={description}
              onChange={setDescription}
              placeholder="Enter task description..."
              minHeight="180px"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={TaskPriority.IMMEDIATE}>Immediate</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.NORMAL}>Normal</option>
                <option value={TaskPriority.LOW}>Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <ProjectMemberSelect
                projectId={projectId}
                value={assigneeId}
                onChange={setAssigneeId}
                showAssignToMe={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <TagsInput
              value={tags}
              onChange={setTags}
              placeholder="Type a tag and press Enter"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
