import { useEffect, useState } from 'react'
import type { ConfirmedReleaseItem, ReleaseResponse } from './releaseTypes'
import { useGetReleaseCandidateItems } from './useGetReleaseCandidateItems'
import ReleaseItemsChecklist, { getReleaseItemKey } from './ReleaseItemsChecklist'

interface PrepareReleaseUATModalProps {
  projectId: number
  release: ReleaseResponse
  onConfirm: (confirmedItems: ConfirmedReleaseItem[]) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function PrepareReleaseUATModal({ projectId, release, onConfirm, onCancel, isLoading }: PrepareReleaseUATModalProps) {
  const { items, isLoading: itemsLoading } = useGetReleaseCandidateItems(projectId, release.id)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedKeys(new Set(items.filter((item) => item.linked).map((item) => getReleaseItemKey(item.itemType, item.id))))
  }, [items])

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

  const handleConfirm = async () => {
    const confirmedItems = items
      .filter((item) => selectedKeys.has(getReleaseItemKey(item.itemType, item.id)))
      .map((item) => ({ id: item.id, itemType: item.itemType }))

    await onConfirm(confirmedItems)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Prepare {release.version} for UAT</h3>
          <p className="text-sm text-gray-500 mt-1">
            Select the features, issues, and tasks that belong in UAT. Unchecked linked items will be unlinked. Linked issues and features still in progress will be moved to In Review automatically.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <ReleaseItemsChecklist
            items={items}
            selectedKeys={selectedKeys}
            onToggle={toggleItem}
            onToggleAll={toggleAll}
            isLoading={itemsLoading}
            emptyMessage="No features, issues, or tasks are available for this release."
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {selectedKeys.size} of {items.length} items selected
          </span>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Move to UAT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}