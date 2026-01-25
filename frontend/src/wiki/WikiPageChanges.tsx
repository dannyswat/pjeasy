import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChangesByItem, useCreateWikiPageChange, useMergeChanges } from './useWikiPageChanges'
import { useListWikiPages } from './useListWikiPages'
import { useGetWikiPage } from './useGetWikiPage'
import { WikiPageChangeStatus, WikiPageChangeStatusDisplay, type WikiPageChangeResponse } from './wikiTypes'
import { UserLabel } from '../components/UserLabel'
import HtmlEditor from '../components/HtmlEditor'

interface WikiPageChangesProps {
  projectId: number
  itemType: 'issue' | 'feature'
  itemId: number
  itemRefNum: string
}

export default function WikiPageChanges({ projectId, itemType, itemId, itemRefNum }: WikiPageChangesProps) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { changes, isLoading, refetch } = useChangesByItem(itemType, itemId)
  const { wikiPages } = useListWikiPages({ projectId, page: 1, pageSize: 100 })
  const { wikiPage: selectedPage, isLoading: isLoadingContent } = useGetWikiPage(selectedPageId || 0)
  const createChange = useCreateWikiPageChange()
  const mergeChanges = useMergeChanges()

  // Preload content when a wiki page is selected
  useEffect(() => {
    if (selectedPageId && selectedPage) {
        console.log('Selected page content loaded:', selectedPage)
      setContent(selectedPage.content || '')

    }
  }, [selectedPageId, selectedPage])

  const getStatusColor = (status: string) => {
    switch (status) {
      case WikiPageChangeStatus.PENDING:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case WikiPageChangeStatus.MERGED:
        return 'bg-green-50 text-green-700 border-green-200'
      case WikiPageChangeStatus.REJECTED:
        return 'bg-red-50 text-red-700 border-red-200'
      case WikiPageChangeStatus.CONFLICT:
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const handleCreateChange = async () => {
    if (!selectedPageId) {
      setError('Please select a wiki page')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    setError(null)
    try {
      await createChange.mutateAsync({
        pageId: selectedPageId,
        projectId,
        data: {
          itemType,
          itemId,
          content: content.trim(),
        },
      })
      setShowCreateForm(false)
      setContent('')
      setSelectedPageId(null)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wiki change')
    }
  }

  const handleMerge = async (change: WikiPageChangeResponse) => {
    try {
      await mergeChanges.mutateAsync({
        projectId,
        data: {
          itemType: change.itemType,
          itemId: change.itemId,
        },
      })
      refetch()
    } catch (err) {
      console.error('Failed to merge changes:', err)
    }
  }

  const pendingCount = changes.filter(c => c.status === WikiPageChangeStatus.PENDING).length
  const conflictCount = changes.filter(c => c.status === WikiPageChangeStatus.CONFLICT).length

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Wiki Page Changes
          {(pendingCount > 0 || conflictCount > 0) && (
            <span className="flex items-center gap-1 ml-2">
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                  {pendingCount} pending
                </span>
              )}
              {conflictCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                  {conflictCount} conflict
                </span>
              )}
            </span>
          )}
        </button>
        {isExpanded && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Wiki Change
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Propose Wiki Change for {itemRefNum}
              </h4>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-3">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Wiki Page <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedPageId || ''}
                    onChange={(e) => {
                      const newPageId = e.target.value ? parseInt(e.target.value) : null
                      setSelectedPageId(newPageId)
                      if (!newPageId) {
                        setContent('')
                      }
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a wiki page...</option>
                    {wikiPages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                  {wikiPages.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No wiki pages available.{' '}
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/wiki?action=create`)}
                        className="text-blue-600 hover:underline"
                      >
                        Create one first
                      </button>
                    </p>
                  )}
                  {selectedPageId && selectedPage && (
                    <p className="text-xs text-gray-500 mt-1">
                      Loaded existing content from: <span className="font-medium">{selectedPage.title}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  {isLoadingContent ? (
                    <div className="flex items-center justify-center py-8 border border-gray-300 rounded bg-gray-50">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading content...</span>
                    </div>
                  ) : (
                    <HtmlEditor
                      value={content}
                      onChange={setContent}
                      placeholder="Enter the wiki content changes..."
                      minHeight="200px"
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setContent('')
                      setSelectedPageId(null)
                      setError(null)
                    }}
                    className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateChange}
                    disabled={createChange.isPending}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {createChange.isPending ? 'Creating...' : 'Create Change'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Changes List */}
          {isLoading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          ) : changes.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              No wiki changes for this {itemType} yet.
            </div>
          ) : (
            <div className="space-y-2">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="bg-white border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(change.status)}`}>
                          {WikiPageChangeStatusDisplay[change.status] || change.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          Change #{change.id}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <UserLabel userId={change.createdBy} />
                        </span>
                        <span>
                          {new Date(change.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {change.status === WikiPageChangeStatus.PENDING && (
                        <button
                          onClick={() => handleMerge(change)}
                          disabled={mergeChanges.isPending}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Merge
                        </button>
                      )}
                      {change.status === WikiPageChangeStatus.CONFLICT && (
                        <button
                          onClick={() => navigate(`/projects/${projectId}/wiki/${change.wikiPageId}`)}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/projects/${projectId}/wiki/${change.wikiPageId}`)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        View Page
                      </button>
                    </div>
                  </div>
                  {change.snapshot && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div 
                        className="text-xs text-gray-600 prose prose-sm max-w-none line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: change.snapshot }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
