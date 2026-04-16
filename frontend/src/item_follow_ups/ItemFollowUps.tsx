import { useState } from 'react'
import { useListItemFollowUps } from './useListItemFollowUps'
import { useCreateItemFollowUp } from './useCreateItemFollowUp'
import { useUpdateItemFollowUp } from './useUpdateItemFollowUp'
import { useDeleteItemFollowUp } from './useDeleteItemFollowUp'
import type { ItemFollowUpResponse } from './itemFollowUpTypes'

interface ItemFollowUpsProps {
  itemId: number
  itemType: string
}

function getTodayDate() {
  const today = new Date()
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

export default function ItemFollowUps({ itemId, itemType }: ItemFollowUpsProps) {
  const [showNewFollowUpForm, setShowNewFollowUpForm] = useState(false)
  const [newFollowUpDate, setNewFollowUpDate] = useState(getTodayDate())
  const [newContent, setNewContent] = useState('')
  const [editingFollowUpId, setEditingFollowUpId] = useState<number | null>(null)
  const [editingFollowUpDate, setEditingFollowUpDate] = useState(getTodayDate())
  const [editingContent, setEditingContent] = useState('')

  const { followUps, isLoading, refetch } = useListItemFollowUps(itemId, itemType)
  const createItemFollowUp = useCreateItemFollowUp()
  const updateItemFollowUp = useUpdateItemFollowUp()
  const deleteItemFollowUp = useDeleteItemFollowUp()

  const isNewFollowUpInvalid = !newFollowUpDate || !newContent.trim()
  const isEditingInvalid = !editingFollowUpDate || !editingContent.trim()

  const handleSubmitNew = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isNewFollowUpInvalid) return

    try {
      await createItemFollowUp.mutateAsync({
        itemId,
        itemType,
        followUpDate: newFollowUpDate,
        content: newContent.trim(),
      })
      setShowNewFollowUpForm(false)
      setNewFollowUpDate(getTodayDate())
      setNewContent('')
      refetch()
    } catch (error) {
      console.error('Failed to create item follow-up:', error)
    }
  }

  const handleStartEdit = (followUp: ItemFollowUpResponse) => {
    setEditingFollowUpId(followUp.id)
    setEditingFollowUpDate(followUp.followUpDate)
    setEditingContent(followUp.content)
  }

  const handleCancelEdit = () => {
    setEditingFollowUpId(null)
    setEditingFollowUpDate(getTodayDate())
    setEditingContent('')
  }

  const handleSaveEdit = async (followUpId: number) => {
    if (isEditingInvalid) return

    try {
      await updateItemFollowUp.mutateAsync({
        followUpId,
        followUpDate: editingFollowUpDate,
        content: editingContent.trim(),
      })
      handleCancelEdit()
      refetch()
    } catch (error) {
      console.error('Failed to update item follow-up:', error)
    }
  }

  const handleDelete = async (followUpId: number) => {
    if (!window.confirm('Are you sure you want to delete this follow-up?')) return

    try {
      await deleteItemFollowUp.mutateAsync({ followUpId })
      refetch()
    } catch (error) {
      console.error('Failed to delete item follow-up:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Item Follow-Ups</h3>
          {!showNewFollowUpForm && (
            <button
              type="button"
              onClick={() => {
                setNewFollowUpDate(getTodayDate())
                setShowNewFollowUpForm(true)
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
            >
              Follow up
            </button>
          )}
        </div>
        {showNewFollowUpForm && (
          <form onSubmit={handleSubmitNew} className="space-y-3">
            <div className="max-w-xs">
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={newFollowUpDate}
                onChange={(event) => setNewFollowUpDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Update</label>
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                rows={4}
                placeholder="Share a status update, blocker, or follow-up note..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isNewFollowUpInvalid || createItemFollowUp.isPending}
                className="rounded-lg bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createItemFollowUp.isPending ? 'Posting...' : 'Post Follow-Up'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewFollowUpForm(false)
                  setNewFollowUpDate(getTodayDate())
                  setNewContent('')
                }}
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900">Follow-Ups ({followUps.length})</h3>

        {followUps.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No follow-ups yet. Add one to highlight progress or blockers.</p>
        ) : (
          <div className="space-y-4">
            {followUps.map((followUp) => (
              <div key={followUp.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                {editingFollowUpId === followUp.id ? (
                  <div className="space-y-3">
                    <div className="max-w-xs">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                      <input
                        type="date"
                        value={editingFollowUpDate}
                        onChange={(event) => setEditingFollowUpDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Update</label>
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(followUp.id)}
                        disabled={isEditingInvalid || updateItemFollowUp.isPending}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updateItemFollowUp.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{followUp.creatorName}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(`${followUp.followUpDate}T00:00:00`).toLocaleDateString()}
                          <span className="ml-2">Posted {new Date(followUp.createdAt).toLocaleString()}</span>
                          {followUp.createdAt !== followUp.updatedAt && (
                            <span className="ml-2 italic">(edited)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartEdit(followUp)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(followUp.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-700">{followUp.content}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}