import { useState } from 'react'
import type { FormEvent } from 'react'
import TagsInput from '../components/TagsInput'
import HtmlEditor from '../components/HtmlEditor'
import ProjectMemberSelect from '../components/ProjectMemberSelect'
import { FeaturePriority, type FeatureResponse } from './featureTypes'

interface EditFeatureFormProps {
  feature: FeatureResponse
  projectId?: number
  onSubmit: (data: {
    title: string
    description: string
    priority: string
    assignedTo?: number
    points: number
    deadline?: string
    tags: string
  }) => Promise<void>
  onCancel: () => void
  onClose?: () => void
  isPending: boolean
}

// Helper function to format date for input field
const formatDateForInput = (dateString?: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

export default function EditFeatureForm({ feature, projectId, onSubmit, onCancel, onClose, isPending }: EditFeatureFormProps) {
  const [title, setTitle] = useState(feature.title)
  const [description, setDescription] = useState(feature.description)
  const [priority, setPriority] = useState(feature.priority)
  const [assignedTo, setAssignedTo] = useState<number | undefined>(feature.assignedTo)
  const [points, setPoints] = useState<number | undefined>(feature.points)
  const [deadline, setDeadline] = useState<string>(formatDateForInput(feature.deadline))
  const [tags, setTags] = useState<string[]>(feature.tags ? feature.tags.split(',').map(t => t.trim()) : [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSubmit({
      title,
      description,
      priority,
      assignedTo,
      points: points ?? 0,
      deadline: deadline || undefined,
      tags: tags.join(','),
    })
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Feature</h2>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <HtmlEditor
              value={description}
              onChange={setDescription}
              placeholder="Enter feature description..."
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={FeaturePriority.IMMEDIATE}>Immediate</option>
                <option value={FeaturePriority.URGENT}>Urgent</option>
                <option value={FeaturePriority.HIGH}>High</option>
                <option value={FeaturePriority.NORMAL}>Normal</option>
                <option value={FeaturePriority.LOW}>Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points (optional)
              </label>
              <input
                type="number"
                value={points ?? ''}
                onChange={(e) => setPoints(e.target.value === '' ? undefined : parseInt(e.target.value))}
                min="0"
                placeholder="Enter points"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline (optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignee
            </label>
            <ProjectMemberSelect
              projectId={projectId ?? feature.projectId}
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
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
