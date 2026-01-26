import { useState } from 'react'
import type { SprintResponse } from './sprintTypes'

interface CloseSprintModalProps {
  sprint: SprintResponse
  onSubmit: (data: {
    createNewSprint: boolean
    newSprintName?: string
    newSprintGoal?: string
    newSprintEndDate?: string
  }) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export default function CloseSprintModal({ sprint, onSubmit, onCancel, isSubmitting }: CloseSprintModalProps) {
  const [createNewSprint, setCreateNewSprint] = useState(true)
  const [newSprintName, setNewSprintName] = useState('')
  const [newSprintGoal, setNewSprintGoal] = useState('')
  const [newSprintEndDate, setNewSprintEndDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      createNewSprint,
      newSprintName: createNewSprint ? newSprintName : undefined,
      newSprintGoal: createNewSprint ? newSprintGoal : undefined,
      newSprintEndDate: createNewSprint ? newSprintEndDate || undefined : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Close Sprint: {sprint.name}</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-yellow-800">Closing this sprint</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  All in-progress tasks will be moved to the new sprint if you choose to create one.
                  Completed and closed tasks will remain in this sprint.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="createNewSprint"
              checked={createNewSprint}
              onChange={(e) => setCreateNewSprint(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="createNewSprint" className="ml-2 block text-sm text-gray-900">
              Create new sprint and move in-progress tasks
            </label>
          </div>

          {createNewSprint && (
            <div className="space-y-4 pl-6 border-l-2 border-indigo-200">
              <div>
                <label htmlFor="newSprintName" className="block text-sm font-medium text-gray-700 mb-1">
                  New Sprint Name *
                </label>
                <input
                  type="text"
                  id="newSprintName"
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  placeholder="e.g., Sprint 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required={createNewSprint}
                />
              </div>

              <div>
                <label htmlFor="newSprintGoal" className="block text-sm font-medium text-gray-700 mb-1">
                  New Sprint Goal
                </label>
                <textarea
                  id="newSprintGoal"
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  placeholder="What do you want to achieve in the new sprint?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="newSprintEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                  New Sprint End Date
                </label>
                <input
                  type="date"
                  id="newSprintEndDate"
                  value={newSprintEndDate}
                  onChange={(e) => setNewSprintEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (createNewSprint && !newSprintName.trim())}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Closing...' : 'Close Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
