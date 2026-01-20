import { useNavigate, useParams } from 'react-router-dom'

interface ItemLinkProps {
  itemType: string
  itemId: number
}

export default function ItemLink({ itemType, itemId }: ItemLinkProps) {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const handleClick = () => {
    // Navigate to detail page with the item ID in the URL
    const itemPath = `/projects/${projectId}/${itemType}/${itemId}`
    navigate(itemPath)
  }

  const itemTypeSingular = itemType === 'ideas' ? 'Idea' : itemType === 'issues' ? 'Issue' : itemType
  
  return (
    <div>
      <span className="text-gray-500 text-xs">Related {itemTypeSingular}:</span>
      <button
        onClick={handleClick}
        className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
      >
        View {itemTypeSingular}
      </button>
    </div>
  )
}
