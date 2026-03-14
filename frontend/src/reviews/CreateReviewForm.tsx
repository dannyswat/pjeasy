import { useState } from 'react'
import DatePicker from '../components/DatePicker'
import type { SprintResponse } from '../sprints/sprintTypes'
import { ReviewType } from './reviewTypes'

interface CreateReviewFormProps {
  sprints: SprintResponse[]
  onSubmit: (data: {
    type: string
    title: string
    description: string
    sprintId?: number
    startDate?: string
    endDate?: string
  }) => void
  onCancel: () => void
  isSubmitting: boolean
}

export default function CreateReviewForm({ sprints, onSubmit, onCancel, isSubmitting }: CreateReviewFormProps) {
  const [reviewType, setReviewType] = useState<string>(ReviewType.SPRINT)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sprintId, setSprintId] = useState<number | undefined>(undefined)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      type: reviewType,
      title,
      description,
      sprintId: reviewType === ReviewType.SPRINT ? sprintId : undefined,
      startDate: reviewType === ReviewType.CUSTOM ? startDate || undefined : undefined,
      endDate: reviewType === ReviewType.CUSTOM ? endDate || undefined : undefined,
    })
  }

  const closedSprints = sprints.filter(s => s.status === 'Closed' || s.status === 'Active')

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Review Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Review Type</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value={ReviewType.SPRINT}
              checked={reviewType === ReviewType.SPRINT}
              onChange={(e) => setReviewType(e.target.value)}
              className="mr-2 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Sprint Review</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value={ReviewType.CUSTOM}
              checked={reviewType === ReviewType.CUSTOM}
              onChange={(e) => setReviewType(e.target.value)}
              className="mr-2 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Custom Review</span>
          </label>
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Review title"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Review description (optional)"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Sprint Selection (for Sprint reviews) */}
      {reviewType === ReviewType.SPRINT && (
        <div>
          <label htmlFor="sprint" className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
          <select
            id="sprint"
            value={sprintId || ''}
            onChange={(e) => setSprintId(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Select a sprint...</option>
            {closedSprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} ({sprint.status})
              </option>
            ))}
          </select>
          {closedSprints.length === 0 && (
            <p className="text-xs text-yellow-600 mt-1">No sprints available for review.</p>
          )}
        </div>
      )}

      {/* Date Range (for Custom reviews) */}
      {reviewType === ReviewType.CUSTOM && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <DatePicker
              id="startDate"
              value={startDate}
              onChange={setStartDate}
              placeholder="Select a start date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <DatePicker
              id="endDate"
              value={endDate}
              onChange={setEndDate}
              placeholder="Select an end date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Review'}
        </button>
      </div>
    </form>
  )
}
