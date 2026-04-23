import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useWikiPageTree } from './useWikiPageTree'
import { useGetWikiPage } from './useGetWikiPage'
import { useCreateWikiPage } from './useCreateWikiPage'
import { useUpdateWikiPage, useUpdateWikiPageContent, useUpdateWikiPageStatus } from './useUpdateWikiPage'
import { useDeleteWikiPage } from './useDeleteWikiPage'
import { usePendingChanges } from './useWikiPageChanges'
import { WikiPageStatus, WikiPageStatusDisplay, buildWikiPageTree, flattenWikiPageTree, getWikiPageDescendantIds, type WikiPageTreeNode } from './wikiTypes'
import { UserLabel } from '../components/UserLabel'
import HtmlEditor from '../components/HtmlEditor'
import WikiPageChangesPanel from './WikiPageChangesPanel'
import { useProjectRole } from '../projects/useProjectRole'

type ViewMode = 'view' | 'create' | 'edit'

export default function WikiPage() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const projectIdNum = projectId ? parseInt(projectId) : 0
  const pageIdNum = pageId ? parseInt(pageId) : 0
  
  // Determine view mode from URL params or internal state
  const actionParam = searchParams.get('action')
  const isCreateFromUrl = actionParam === 'create'
  
  // State - only for edit mode (create mode is driven by URL)
  const [internalMode, setInternalMode] = useState<'view' | 'edit'>('view')
  const [showChangesPanel, setShowChangesPanel] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  
  // Derive effective view mode
  const viewMode: ViewMode = isCreateFromUrl ? 'create' : internalMode
  
  // Form state for create/edit
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [parentId, setParentId] = useState<number | ''>('')
  const [isProtected, setIsProtected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch all wiki pages for the sidebar and parent selectors
  const { wikiPages, isLoading: isLoadingList, refetch: refetchList } = useWikiPageTree(projectIdNum)
  
  // Fetch the current wiki page if we have a pageId
  const { wikiPage, isLoading: isLoadingPage, refetch: refetchPage } = useGetWikiPage(pageIdNum)
  const { changes: pendingChanges } = usePendingChanges(pageIdNum)
  const { canWrite, isProjectUser } = useProjectRole(projectIdNum)
  const isLoading = isLoadingList || (pageIdNum && isLoadingPage)
  
  // Mutations
  const createWikiPage = useCreateWikiPage()
  const updateWikiPage = useUpdateWikiPage()
  const updateWikiPageContent = useUpdateWikiPageContent()
  const updateWikiPageStatus = useUpdateWikiPageStatus()
  const deleteWikiPage = useDeleteWikiPage()
  const tree = buildWikiPageTree(wikiPages)
  const createParentOptions = flattenWikiPageTree(tree)
  const blockedIds = pageIdNum ? getWikiPageDescendantIds(tree, pageIdNum) : new Set<number>()
  if (pageIdNum) {
    blockedIds.add(pageIdNum)
  }
  const editParentOptions = flattenWikiPageTree(tree).filter((option) => !blockedIds.has(option.id))
  
  // Navigate to first wiki page if none selected and pages exist
  useEffect(() => {
    if (!pageId && wikiPages.length > 0 && viewMode === 'view') {
      navigate(`/projects/${projectId}/wiki/${wikiPages[0].id}`, { replace: true })
    }
  }, [pageId, wikiPages, projectId, navigate, viewMode])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (viewMode !== 'view') {
      setShowActionsMenu(false)
    }
  }, [viewMode, pageIdNum])

  useEffect(() => {
    if (pageId && !isLoading && !wikiPage && wikiPages.length > 0 && viewMode === 'view') {
      navigate(`/projects/${projectId}/wiki/${wikiPages[0].id}`, { replace: true })
    }
  }, [pageId, isLoading, wikiPage, wikiPages, viewMode, navigate, projectId])
  
  const handleStartCreate = () => {
    // Navigate to create mode via URL
    navigate(`/projects/${projectId}/wiki?action=create`)
    setTitle('')
    setContent('')
    setSortOrder(wikiPages.length)
    setParentId('')
    setIsProtected(false)
    setError(null)
  }
  
  const handleStartEdit = () => {
    if (wikiPage) {
      setInternalMode('edit')
      setTitle(wikiPage.title)
      setContent(wikiPage.content || '')
      setSortOrder(wikiPage.sortOrder)
      setParentId(wikiPage.parentId ?? '')
      setIsProtected(wikiPage.protected)
      setError(null)
    }
  }
  
  const handleCancel = () => {
    setInternalMode('view')
    setError(null)
    // Remove the action param from URL if present
    if (searchParams.get('action')) {
      navigate(`/projects/${projectId}/wiki${pageId ? `/${pageId}` : ''}`, { replace: true })
    }
  }
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    
    try {
      const result = await createWikiPage.mutateAsync({
        projectId: projectIdNum,
        data: {
          title: title.trim(),
          content,
          parentId: parentId === '' ? undefined : parentId,
          protected: isProtected,
          sortOrder,
        },
      })
      
      // Navigate to the new page
      refetchList()
      setInternalMode('view')
      if (result && typeof result === 'object' && 'id' in result) {
        navigate(`/projects/${projectId}/wiki/${result.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wiki page')
    }
  }
  
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    
    try {
      // Update title and sort order
      await updateWikiPage.mutateAsync({
        pageId: pageIdNum,
        projectId: projectIdNum,
        data: {
          title: title.trim(),
          parentId: parentId === '' ? undefined : parentId,
          protected: isProtected,
          sortOrder,
        },
      })
      
      // Update content separately if changed
      if (content !== wikiPage?.content) {
        await updateWikiPageContent.mutateAsync({
          pageId: pageIdNum,
          projectId: projectIdNum,
          data: { content },
        })
      }
      
      refetchPage()
      refetchList()
      setInternalMode('view')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update wiki page')
    }
  }
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this wiki page?')) return
    
    try {
      setShowActionsMenu(false)
      await deleteWikiPage.mutateAsync({
        pageId: pageIdNum,
        projectId: projectIdNum,
      })
      refetchList()
      // Navigate to wiki root, which will redirect to first page
      navigate(`/projects/${projectId}/wiki`)
    } catch (err) {
      console.error('Failed to delete wiki page:', err)
    }
  }
  
  const handleStatusChange = async (status: string) => {
    try {
      await updateWikiPageStatus.mutateAsync({
        pageId: pageIdNum,
        projectId: projectIdNum,
        data: { status },
      })
      refetchPage()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleShowHistory = () => {
    setShowActionsMenu(false)
    setShowChangesPanel(true)
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case WikiPageStatus.DRAFT:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case WikiPageStatus.PUBLISHED:
        return 'bg-green-50 text-green-700 border-green-200'
      case WikiPageStatus.ARCHIVED:
        return 'bg-gray-50 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const renderSidebarNode = (node: WikiPageTreeNode, level: number = 0) => (
    <div key={node.id}>
      <button
        onClick={() => {
          setInternalMode('view')
          setShowSidebar(false)
          navigate(`/projects/${projectId}/wiki/${node.id}`)
        }}
        className={`w-full text-left rounded-lg text-sm transition ${
          node.id === pageIdNum
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ padding: '0.5rem 0.75rem', paddingLeft: `${0.75 + level * 1}rem` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate">{node.title}</span>
          {node.protected && !isProjectUser && (
            <span className="inline-flex items-center text-amber-700" role="img" aria-label="Protected page" title="Protected page">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 8a5 5 0 1110 0v1h.5A1.5 1.5 0 0117 10.5v6A1.5 1.5 0 0115.5 18h-11A1.5 1.5 0 013 16.5v-6A1.5 1.5 0 014.5 9H5V8zm2 1h6V8a3 3 0 10-6 0v1z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
      </button>
      {node.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => renderSidebarNode(child, level + 1))}
        </div>
      )}
    </div>
  )

  const isPending = createWikiPage.isPending || updateWikiPage.isPending || updateWikiPageContent.isPending

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view wiki pages.</p>
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

  return (
    <div className="flex h-full relative">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="md:hidden fixed bottom-4 left-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile sidebar backdrop */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Wiki Sidebar */}
      <div className={`${
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 fixed md:static top-0 bottom-0 left-0 z-40 md:z-auto w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Wiki</h2>
            {canWrite && <button
              onClick={handleStartCreate}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Create new page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoadingList ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : wikiPages.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No wiki pages yet
            </div>
          ) : (
            <nav className="p-2">
              <div className="space-y-1">
                {tree.map((node) => renderSidebarNode(node))}
              </div>
            </nav>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 min-w-0">
        {isLoading ? (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        ) : viewMode === 'create' ? (
          // Create Form
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">Create New Wiki Page</h1>
              </div>
              
              <form onSubmit={handleCreate} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter wiki page title"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Page
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value, 10) : '')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No parent</option>
                    {createParentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {`${'  '.repeat(option.level)}${option.title}`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Nest this page under an existing page.</p>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    id="createWikiProtected"
                    checked={isProtected}
                    onChange={(e) => setIsProtected(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <label htmlFor="createWikiProtected" className="block text-sm font-medium text-gray-700">
                      Protected page
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      Only project members and managers can see this page in the wiki menu and open it directly.
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <HtmlEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Enter wiki page content..."
                    minHeight="400px"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isPending ? 'Creating...' : 'Create Page'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : viewMode === 'edit' && wikiPage ? (
          // Edit Form
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">Edit Wiki Page</h1>
              </div>
              
              <form onSubmit={handleUpdate} className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter wiki page title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Page
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value, 10) : '')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No parent</option>
                    {editParentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {`${'  '.repeat(option.level)}${option.title}`}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Choose where this page appears in the wiki menu.</p>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    id="editWikiProtected"
                    checked={isProtected}
                    onChange={(e) => setIsProtected(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <label htmlFor="editWikiProtected" className="block text-sm font-medium text-gray-700">
                      Protected page
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      Only project members and managers can see this page in the wiki menu and open it directly.
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <HtmlEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Enter wiki page content..."
                    minHeight="400px"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-32 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Lower numbers appear first in the list.</p>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : wikiPages.length === 0 ? (
          // Empty State - No wiki pages
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2 className="mt-6 text-xl font-semibold text-gray-900">No Wiki Pages Yet</h2>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                {canWrite
                  ? 'Start documenting your project by creating your first wiki page.'
                  : 'There are no wiki pages available to your role.'}
              </p>
              {canWrite && (
                <button
                  onClick={handleStartCreate}
                  className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Start Creating First Wiki Page
                </button>
              )}
            </div>
          </div>
        ) : wikiPage ? (
          // View Mode - Show wiki page content
          <div className="p-6">
            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{wikiPage.title}</h1>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(wikiPage.status)}`}>
                      {WikiPageStatusDisplay[wikiPage.status] || wikiPage.status}
                    </span>
                    {wikiPage.protected && (
                      <span className="inline-flex items-center text-amber-700" role="img" aria-label="Protected page" title="Protected page">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 8a5 5 0 1110 0v1h.5A1.5 1.5 0 0117 10.5v6A1.5 1.5 0 0115.5 18h-11A1.5 1.5 0 013 16.5v-6A1.5 1.5 0 014.5 9H5V8zm2 1h6V8a3 3 0 10-6 0v1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                    <span className="text-sm text-gray-500">v{wikiPage.version}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">/{wikiPage.slug}</div>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <span>Updated by:</span>
                      <UserLabel userId={wikiPage.updatedBy} />
                      <span>on {new Date(wikiPage.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {canWrite && (<div className="flex flex-wrap gap-2">
                  {pendingChanges.length > 0 && (
                    <button
                      onClick={() => setShowChangesPanel(true)}
                      className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {pendingChanges.length} Pending
                    </button>
                  )}
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Edit
                  </button>
                  <select
                    value={wikiPage.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(WikiPageStatusDisplay).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <div className="relative" ref={actionsMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowActionsMenu((prev) => !prev)}
                      className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 transition"
                      aria-label="More actions"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5A1.5 1.5 0 1010 8.5a1.5 1.5 0 000 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                      </svg>
                    </button>
                    {showActionsMenu && (
                      <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={handleShowHistory}
                          className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <span>History</span>
                          {pendingChanges.length > 0 && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                              {pendingChanges.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>)}
              </div>
            </div>
            
            {/* Page Content */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                {wikiPage.content ? (
                  <div 
                    className="prose prose-full-width"
                    dangerouslySetInnerHTML={{ __html: wikiPage.content }}
                  />
                ) : (
                  <div className="text-gray-500 text-center py-12">
                    <p>No content yet.</p>
                    <button
                      onClick={handleStartEdit}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Click here to add content
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Loading state when page not found
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <p className="text-gray-500">Select a wiki page from the sidebar</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Changes Panel */}
      {showChangesPanel && pageIdNum && (
        <WikiPageChangesPanel
          pageId={pageIdNum}
          projectId={projectIdNum}
          onClose={() => setShowChangesPanel(false)}
          onMergeComplete={() => refetchPage()}
        />
      )}
    </div>
  )
}
