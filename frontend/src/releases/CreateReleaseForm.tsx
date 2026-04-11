import { useState } from 'react'
import type { ConfirmedReleaseItem } from './releaseTypes'
import { useGetReleaseCandidateItems } from './useGetReleaseCandidateItems'
import ReleaseItemsChecklist, { getReleaseItemKey } from './ReleaseItemsChecklist'

interface CreateReleaseFormProps {
  projectId: number
  onSubmit: (data: { version: string; description: string; targetDate?: string; selectedItems: ConfirmedReleaseItem[] }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function CreateReleaseForm({ projectId, onSubmit, onCancel, isLoading }: CreateReleaseFormProps) {
  const [version, setVersion] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const { items, isLoading: itemsLoading } = useGetReleaseCandidateItems(projectId)

  const toggleItem = (itemType: string, id: number) => {
    const key = getReleaseItemKey(itemType, id)
    setSelectedKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys)
      if (nextKeys.has(key)) {
        nextKeys.delete(key)
      } else {
        nextKeys.add(key)
      }
      return nextKeys
    })
  }

  const toggleAll = () => {
    const allSelected = items.length > 0 && items.every((item) => selectedKeys.has(getReleaseItemKey(item.itemType, item.id)))
    if (allSelected) {
      setSelectedKeys(new Set())
      return
    }

    setSelectedKeys(new Set(items.map((item) => getReleaseItemKey(item.itemType, item.id))))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      version,
      description,
      targetDate: targetDate || undefined,
      selectedItems: items
        .filter((item) => selectedKeys.has(getReleaseItemKey(item.itemType, item.id)))
        .map((item) => ({ id: item.id, itemType: item.itemType })),
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Release</h3>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Version *</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 1.0.0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Linked Items</label>
              <span className="text-xs text-gray-500">Optional</span>
            </div>
            <p className="text-sm text-gray-500 mb-3">Select existing features, issues, or tasks to include in this release.</p>
            <ReleaseItemsChecklist
              items={items}
              selectedKeys={selectedKeys}
              onToggle={toggleItem}
              onToggleAll={toggleAll}
              isLoading={itemsLoading}
              emptyMessage="No available features, issues, or tasks to link."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !version.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
