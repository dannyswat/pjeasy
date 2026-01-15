import type { IdeaResponse } from './ideaTypes'

interface IdeaDetailModalProps {
  idea: IdeaResponse
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
}

export default function IdeaDetailModal({ idea, onClose, onEdit, onDelete, onStatusChange }: IdeaDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">{idea.title}</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
              idea.status === 'Open' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {idea.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{idea.description || 'No description provided'}</p>
          </div>

          {/* Tags */}
          {idea.tags && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {idea.tags.split(',').map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 text-gray-900">{new Date(idea.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Updated:</span>
                <span className="ml-2 text-gray-900">{new Date(idea.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => onStatusChange(idea.status === 'Open' ? 'Closed' : 'Open')}
              className={`px-4 py-2 text-sm rounded-lg transition ${
                idea.status === 'Open'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {idea.status === 'Open' ? 'Close Idea' : 'Reopen Idea'}
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onEdit}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
