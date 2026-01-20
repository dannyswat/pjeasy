import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSecureApi } from '../apis/fetch'
import { useUpdateIdeaStatus } from './useUpdateIdeaStatus'
import { useDeleteIdea } from './useDeleteIdea'
import { type IdeaResponse } from './ideaTypes'
import EditIdeaForm from './EditIdeaForm'
import Comments from '../comments/Comments'
import RelatedTasks from '../tasks/RelatedTasks'
import { useUpdateIdea } from './useUpdateIdea'

export default function IdeaDetailPage() {
  const { projectId, ideaId } = useParams<{ projectId: string; ideaId: string }>()
  const navigate = useNavigate()
  const [idea, setIdea] = useState<IdeaResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingIdea, setEditingIdea] = useState<IdeaResponse | null>(null)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const ideaIdNum = ideaId ? parseInt(ideaId) : 0
  const updateIdeaStatus = useUpdateIdeaStatus()
  const deleteIdea = useDeleteIdea()
  const updateIdea = useUpdateIdea()

  const fetchIdea = async () => {
    try {
      setIsLoading(true)
      const data = await getSecureApi<IdeaResponse>(
        `/api/ideas/${ideaIdNum}`
      )
      setIdea(data)
    } catch (error) {
      console.error('Failed to fetch idea:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchIdea()
  }, [projectIdNum, ideaIdNum])

  const handleStatusChange = async (status: string) => {
    if (!idea) return

    try {
      await updateIdeaStatus.mutateAsync({
        ideaId: idea.id,
        projectId: projectIdNum,
        status,
      })
      fetchIdea()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async () => {
    if (!idea || !window.confirm('Are you sure you want to delete this idea?')) return

    try {
      await deleteIdea.mutateAsync({
        ideaId: idea.id,
        projectId: projectIdNum,
      })
      navigate(`/projects/${projectId}/ideas`)
    } catch (error) {
      console.error('Failed to delete idea:', error)
    }
  }

  const handleUpdateSubmit = async (data: {
    title: string
    description: string
    tags: string
  }) => {
    if (!editingIdea) return

    try {
      await updateIdea.mutateAsync({
        ideaId: editingIdea.id,
        projectId: projectIdNum,
        ...data,
      })
      setEditingIdea(null)
      fetchIdea()
    } catch (error) {
      console.error('Failed to update idea:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 flex justify-center items-center min-h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!idea) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">Idea Not Found</h3>
          <button
            onClick={() => navigate(`/projects/${projectId}/ideas`)}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Back to Ideas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {editingIdea ? (
        <EditIdeaForm
          idea={editingIdea}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setEditingIdea(null)}
          isPending={updateIdea.isPending}
        />
      ) : (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/projects/${projectId}/ideas`)}
            className="flex items-center text-indigo-600 hover:text-indigo-700 transition text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Ideas
          </button>

          {/* Idea Detail */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-gray-900">{idea.title}</h1>
                  <span className="text-xs text-gray-500">[{idea.refNum}]</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    idea.status === 'Open' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {idea.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pb-3 border-b border-gray-200 mb-5">
              <button
                onClick={() => handleStatusChange(idea.status === 'Open' ? 'Closed' : 'Open')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                  idea.status === 'Open'
                    ? 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                {idea.status === 'Open' ? 'Close' : 'Reopen'}
              </button>
              
              <button
                onClick={() => setEditingIdea(idea)}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              >
                Edit
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  onBlur={() => setTimeout(() => setShowDeleteMenu(false), 200)}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                  title="More actions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {showDeleteMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        setShowDeleteMenu(false)
                        handleDelete()
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded transition"
                    >
                      Delete Idea
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <div 
                className="text-sm text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: idea.description || '<p class="text-gray-500 italic">No description provided</p>' 
                }}
              />
            </div>

            {/* Tags */}
            {idea.tags && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {idea.tags.split(',').map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Information</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(idea.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(idea.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Tasks Section */}
            <RelatedTasks 
              projectId={projectIdNum} 
              itemType="ideas" 
              itemId={idea.id}
              itemRefNum={idea.refNum}
              itemTitle={idea.title}
            />

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <Comments itemId={idea.id} itemType="ideas" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
