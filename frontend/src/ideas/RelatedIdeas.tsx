import { useState } from 'react'
import { useListIdeasByItem } from './useListIdeasByItem'
import { useCreateIdea } from './useCreateIdea'
import { useUpdateIdeaStatus } from './useUpdateIdeaStatus'
import { type IdeaResponse } from './ideaTypes'
import CreateIdeaForm from './CreateIdeaForm'

interface RelatedIdeasProps {
  projectId: number
  itemType: string
  itemId: number
  itemRefNum?: string
  itemTitle?: string
}

export default function RelatedIdeas({ projectId, itemType, itemId }: RelatedIdeasProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { ideas, isLoading, refetch } = useListIdeasByItem({ projectId, itemType, itemId, pageSize: 50 })
  const createIdea = useCreateIdea()
  const updateIdeaStatus = useUpdateIdeaStatus()

  const handleCreateIdea = async (data: {
    title: string
    description: string
    tags: string
  }) => {
    try {
      await createIdea.mutateAsync({
        projectId,
        title: data.title,
        description: data.description,
        itemType,
        itemId,
        tags: data.tags,
      })
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to create idea:', error)
    }
  }

  const handleToggleStatus = async (idea: IdeaResponse) => {
    const newStatus = idea.status === 'Open' ? 'Closed' : 'Open'
    try {
      await updateIdeaStatus.mutateAsync({
        ideaId: idea.id,
        projectId,
        status: newStatus,
      })
      refetch()
    } catch (error) {
      console.error('Failed to update idea status:', error)
    }
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Related Ideas</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition flex items-center"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Idea
        </button>
      </div>

      {/* Create Idea Modal */}
      {showCreateModal && (
        <CreateIdeaForm
          onSubmit={handleCreateIdea}
          onCancel={() => setShowCreateModal(false)}
          isPending={createIdea.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
          <p className="text-xs text-gray-500">No related ideas yet. Create one using the button above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea: IdeaResponse) => (
            <div
              key={idea.id}
              className="bg-gray-50 border border-gray-200 rounded p-3 hover:bg-gray-100 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <button
                      onClick={() => handleToggleStatus(idea)}
                      disabled={updateIdeaStatus.isPending}
                      className="shrink-0"
                    >
                      {idea.status === 'Closed' ? (
                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-emerald-600 hover:text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        </svg>
                      )}
                    </button>
                    <h4 className={`text-sm font-medium ${idea.status === 'Closed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      <span className="text-gray-500 mr-1.5 text-xs">[{idea.refNum}]</span>
                      {idea.title}
                    </h4>
                  </div>
                  {idea.tags && (
                    <div className="flex flex-wrap gap-1 ml-7">
                      {idea.tags.split(',').map((tag: string, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                    idea.status === 'Open' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {idea.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
