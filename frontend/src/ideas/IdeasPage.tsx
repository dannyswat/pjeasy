import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListIdeas } from './useListIdeas'
import { useCreateIdea } from './useCreateIdea'
import { useUpdateIdea } from './useUpdateIdea'
import { useUpdateIdeaStatus } from './useUpdateIdeaStatus'
import { useDeleteIdea } from './useDeleteIdea'
import { IdeaStatus, type IdeaResponse } from './ideaTypes'
import CreateIdeaForm from './CreateIdeaForm'
import EditIdeaForm from './EditIdeaForm'
import Comments from '../comments/Comments'
import RelatedTasks from '../tasks/RelatedTasks'

export default function IdeasPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingIdea, setEditingIdea] = useState<IdeaResponse | null>(null)
  const [viewingIdea, setViewingIdea] = useState<IdeaResponse | null>(null)
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { ideas, total, isLoading, refetch } = useListIdeas({ projectId: projectIdNum, page, pageSize, status: statusFilter })
  const createIdea = useCreateIdea()
  const updateIdea = useUpdateIdea()
  const updateIdeaStatus = useUpdateIdeaStatus()
  const deleteIdea = useDeleteIdea()

  const totalPages = Math.ceil(total / pageSize)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view and manage ideas.</p>
          <button
            onClick={() => navigate('/projects')}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Go to Projects
          </button>
        </div>
      </div>
    )
  }

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCreateTitle.trim()) return

    try {
      await createIdea.mutateAsync({
        projectId: projectIdNum,
        title: quickCreateTitle,
        description: '',
        tags: '',
      })
      setQuickCreateTitle('')
      refetch()
    } catch (error) {
      console.error('Failed to create idea:', error)
    }
  }

  const handleCreateSubmit = async (data: { title: string; description: string; tags: string }) => {
    try {
      await createIdea.mutateAsync({
        projectId: projectIdNum,
        ...data,
      })
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to create idea:', error)
    }
  }

  const handleUpdateSubmit = async (data: { title: string; description: string; tags: string }) => {
    if (!editingIdea) return

    try {
      await updateIdea.mutateAsync({
        ideaId: editingIdea.id,
        projectId: projectIdNum,
        ...data,
      })
      setEditingIdea(null)
      refetch()
    } catch (error) {
      console.error('Failed to update idea:', error)
    }
  }

  const handleStatusChange = async (ideaId: number, status: string) => {
    try {
      await updateIdeaStatus.mutateAsync({
        ideaId,
        projectId: projectIdNum,
        status,
      })
      setViewingIdea(null)
      refetch()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async (ideaId: number) => {
    if (!window.confirm('Are you sure you want to delete this idea?')) return

    try {
      await deleteIdea.mutateAsync({
        ideaId,
        projectId: projectIdNum,
      })
      setViewingIdea(null)
      refetch()
    } catch (error) {
      console.error('Failed to delete idea:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Show idea detail as full page */}
      {viewingIdea ? (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => setViewingIdea(null)}
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
                  <h1 className="text-xl font-semibold text-gray-900">{viewingIdea.title}</h1>
                  <span className="text-xs text-gray-500">[{viewingIdea.refNum}]</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    viewingIdea.status === 'Open' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {viewingIdea.status}
                  </span>
                </div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pb-3 border-b border-gray-200 mb-5">
              <button
                onClick={() => handleStatusChange(viewingIdea.id, viewingIdea.status === 'Open' ? 'Closed' : 'Open')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                  viewingIdea.status === 'Open'
                    ? 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                {viewingIdea.status === 'Open' ? 'Close' : 'Reopen'}
              </button>
              
              <button
                onClick={() => {
                  setEditingIdea(viewingIdea)
                  setViewingIdea(null)
                }}
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
                        handleDelete(viewingIdea.id)
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
                  __html: viewingIdea.description || '<p class="text-gray-500 italic">No description provided</p>' 
                }}
              />
            </div>

            {/* Tags */}
            {viewingIdea.tags && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingIdea.tags.split(',').map((tag, idx) => (
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
                    {new Date(viewingIdea.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(viewingIdea.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Related Tasks Section */}
            <RelatedTasks 
              projectId={projectIdNum} 
              itemType="idea" 
              itemId={viewingIdea.id}
              itemRefNum={viewingIdea.refNum}
              itemTitle={viewingIdea.title}
            />

            {/* Comments Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <Comments itemId={viewingIdea.id} itemType="ideas" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Ideas</h1>
            <p className="text-sm text-gray-600 mt-1">Manage project ideas and feature requests</p>
          </div>

          {/* Quick Create */}
          <div className="mb-4">
            <form onSubmit={handleQuickCreate} className="flex gap-2">
              <input
                type="text"
                value={quickCreateTitle}
                onChange={(e) => setQuickCreateTitle(e.target.value)}
                placeholder="Type an idea and press Enter to add quickly..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!quickCreateTitle.trim() || createIdea.isPending}
                className="px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Detailed
              </button>
            </form>
          </div>

          {/* Filters */}
          <div className="mb-4 flex items-center space-x-3">
            <label className="text-xs font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value={IdeaStatus.OPEN}>Open</option>
              <option value={IdeaStatus.CLOSED}>Closed</option>
            </select>
          </div>

          {/* Ideas List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-3 text-sm text-gray-600">Loading ideas...</p>
              </div>
            </div>
          ) : ideas.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="mt-3 text-base font-medium text-gray-900">No ideas yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first idea.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded border border-gray-200 divide-y divide-gray-200">
                {ideas.map((idea) => (
                  <div 
                    key={idea.id} 
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition group"
                  >
                    <div 
                      className="flex-1 cursor-pointer" 
                      onClick={() => setViewingIdea(idea)}
                    >
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition">
                          <span className="text-gray-500 mr-1.5 text-xs">[{idea.refNum}]</span><span>{idea.title}</span>
                        </h3>
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                          idea.status === IdeaStatus.OPEN 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          {idea.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingIdea(idea)
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(idea.id)
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} ideas
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                      </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateIdeaForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
          isPending={createIdea.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingIdea && (
        <EditIdeaForm
          idea={editingIdea}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setEditingIdea(null)}
          isPending={updateIdea.isPending}
        />
      )}
    </div>
  )
}
