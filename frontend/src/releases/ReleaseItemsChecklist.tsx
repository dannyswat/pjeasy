import type { ReleaseCandidateItemResponse } from './releaseTypes'

interface ReleaseItemsChecklistProps {
  items: ReleaseCandidateItemResponse[]
  selectedKeys: Set<string>
  onToggle: (itemType: string, id: number) => void
  onToggleAll: () => void
  isLoading?: boolean
  emptyMessage: string
}

export function getReleaseItemKey(itemType: string, id: number) {
  return `${itemType}:${id}`
}

function getItemTypeBadge(itemType: string) {
  switch (itemType) {
    case 'feature': return 'bg-purple-100 text-purple-800'
    case 'issue': return 'bg-red-100 text-red-800'
    case 'task': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function ReleaseItemsChecklist({ items, selectedKeys, onToggle, onToggleAll, isLoading, emptyMessage }: ReleaseItemsChecklistProps) {
  const allChecked = items.length > 0 && items.every((item) => selectedKeys.has(getReleaseItemKey(item.itemType, item.id)))

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading items...</div>
  }

  if (items.length === 0) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>
  }

  return (
    <>
      <div className="mb-3 flex items-center">
        <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={onToggleAll}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="font-medium">Select All ({items.length} items)</span>
        </label>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {items.map((item) => (
          <label
            key={`${item.itemType}-${item.id}`}
            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedKeys.has(getReleaseItemKey(item.itemType, item.id))}
              onChange={() => onToggle(item.itemType, item.id)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getItemTypeBadge(item.itemType)}`}>
              {item.itemType}
            </span>
            {item.refNum && <span className="text-sm font-mono text-gray-500">{item.refNum}</span>}
            <span className="text-sm text-gray-900 flex-1">{item.title}</span>
            <span className="text-xs text-gray-500">{item.status}</span>
          </label>
        ))}
      </div>
    </>
  )
}