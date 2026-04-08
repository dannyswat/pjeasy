import { useEffect, useState } from 'react'
import { useGetReleaseItems } from './useGetReleaseItems'
import { ReleaseStatusDisplay } from './releaseTypes'
import type { ConfirmedReleaseItem, ReleaseResponse } from './releaseTypes'

interface CompleteReleaseModalProps {
  release: ReleaseResponse
  onComplete: (confirmedItems: ConfirmedReleaseItem[]) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function CompleteReleaseModal({ release, onComplete, onCancel, isLoading }: CompleteReleaseModalProps) {
  const { items, isLoading: itemsLoading } = useGetReleaseItems(release.id)
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    setCheckedKeys(new Set(items.map((item) => `${item.itemType}:${item.id}`)))
  }, [items])

  // Update checked set when items load
  const allChecked = items.length > 0 && items.every(i => checkedKeys.has(`${i.itemType}:${i.id}`))

  const getItemKey = (itemType: string, id: number) => `${itemType}:${id}`

  const toggleItem = (itemType: string, id: number) => {
    const key = getItemKey(itemType, id)
    setCheckedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (allChecked) {
      setCheckedKeys(new Set())
    } else {
      setCheckedKeys(new Set(items.map(i => getItemKey(i.itemType, i.id))))
    }
  }

  const handleComplete = async () => {
    await onComplete(
      items
        .filter((item) => checkedKeys.has(getItemKey(item.itemType, item.id)))
        .map((item) => ({ id: item.id, itemType: item.itemType })),
    )
  }

  const getItemTypeBadge = (itemType: string) => {
    switch (itemType) {
      case 'feature': return 'bg-purple-100 text-purple-800'
      case 'issue': return 'bg-red-100 text-red-800'
      case 'task': return 'bg-blue-100 text-blue-800'
      case 'idea': return 'bg-yellow-100 text-yellow-800'
      case 'sprint': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Complete Release: {release.version}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Check the items that are included in this release. Unchecked items will be unlinked.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {itemsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading items...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No items linked to this release.</div>
          ) : (
            <>
              <div className="mb-3 flex items-center">
                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium">Select All ({items.length} items)</span>
                </label>
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <label
                    key={`${item.itemType}-${item.id}`}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checkedKeys.has(getItemKey(item.itemType, item.id))}
                      onChange={() => toggleItem(item.itemType, item.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getItemTypeBadge(item.itemType)}`}>
                      {item.itemType}
                    </span>
                    {item.refNum && (
                      <span className="text-sm font-mono text-gray-500">{item.refNum}</span>
                    )}
                    <span className="text-sm text-gray-900 flex-1">{item.title}</span>
                    <span className="text-xs text-gray-500">{ReleaseStatusDisplay[item.status] || item.status}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {checkedKeys.size} of {items.length} items selected
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
              onClick={handleComplete}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Completing...' : 'Complete Release'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
