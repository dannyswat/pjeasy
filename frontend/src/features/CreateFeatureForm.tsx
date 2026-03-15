import { useState } from 'react'
import type { FormEvent } from 'react'
import TagsInput from '../components/TagsInput'
import HtmlEditor from '../components/HtmlEditor'
import DatePicker from '../components/DatePicker'
import ProjectMemberSelect from '../components/ProjectMemberSelect'
import { FeaturePriority } from './featureTypes'

interface CreateFeatureFormProps {
  projectId: number
  onSubmit: (data: {
    title: string
    description: string
    priority: string
    assignedTo?: number
    points: number
    deadline?: string
    tags: string
    cascadeCompletion: boolean
  }) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

export default function CreateFeatureForm({ projectId, onSubmit, onCancel, isPending }: CreateFeatureFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<string>(FeaturePriority.NORMAL)
  const [assignedTo, setAssignedTo] = useState<number | undefined>(undefined)
  const [points, setPoints] = useState<number | undefined>(undefined)
  const [deadline, setDeadline] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [cascadeCompletion, setCascadeCompletion] = useState(false)

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
      cascadeCompletion,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Feature</h2>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <DatePicker
                value={deadline}
                onChange={setDeadline}
                placeholder="Select a deadline"
                className="flex-1 h-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {deadline && (
                <button
                  type="button"
                  onClick={() => setDeadline('')}
                  className="h-10 px-3 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Clear
                </button>
              )}
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="cascadeCompletion"
              checked={cascadeCompletion}
              onChange={(e) => setCascadeCompletion(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="cascadeCompletion" className="ml-2 block text-sm text-gray-700">
              Cascade Completion
            </label>
            <p className="ml-2 text-xs text-gray-500">Auto-complete when all tasks are done</p>
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
