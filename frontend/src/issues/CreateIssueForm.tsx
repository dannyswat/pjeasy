import { useState } from 'react'
import type { FormEvent } from 'react'
import TagsInput from '../components/TagsInput'
import HtmlEditor from '../components/HtmlEditor'
import ProjectMemberSelect from '../components/ProjectMemberSelect'
import { IssuePriority } from './issueTypes'

interface CreateIssueFormProps {
  projectId: number
  onSubmit: (data: {
    title: string
    description: string
    priority: string
    assignedTo?: number
    points: number
    tags: string
  }) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

export default function CreateIssueForm({ projectId, onSubmit, onCancel, isPending }: CreateIssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<string>(IssuePriority.NORMAL)
  const [assignedTo, setAssignedTo] = useState<number | undefined>(undefined)
  const [points, setPoints] = useState(0)
  const [tags, setTags] = useState<string[]>([])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSubmit({
      title,
      description,
      priority,
      assignedTo,
      points,
      tags: tags.join(','),
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Issue</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <HtmlEditor
              value={description}
              onChange={setDescription}
              placeholder="Enter issue description..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value={IssuePriority.IMMEDIATE}>Immediate</option>
                <option value={IssuePriority.URGENT}>Urgent</option>
                <option value={IssuePriority.HIGH}>High</option>
                <option value={IssuePriority.NORMAL}>Normal</option>
                <option value={IssuePriority.LOW}>Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points
              </label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignee
            </label>
            <ProjectMemberSelect
              projectId={projectId}
              value={assignedTo}
              onChange={setAssignedTo}
              placeholder="Select assignee (optional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <TagsInput
              value={tags}
              onChange={setTags}
              placeholder="Type a tag and press Enter"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
