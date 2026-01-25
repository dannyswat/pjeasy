import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGetWikiPage } from './useGetWikiPage'
import { useUpdateWikiPage, useUpdateWikiPageContent, useUpdateWikiPageStatus } from './useUpdateWikiPage'
import { useDeleteWikiPage } from './useDeleteWikiPage'
import { usePendingChanges } from './useWikiPageChanges'
import { WikiPageStatus, WikiPageStatusDisplay } from './wikiTypes'
import { UserLabel } from '../components/UserLabel'
import EditWikiPageForm from './EditWikiPageForm'
import WikiPageChangesPanel from './WikiPageChangesPanel'

export default function WikiPageDetailPage() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [showChangesPanel, setShowChangesPanel] = useState(false)

  const pageIdNum = pageId ? parseInt(pageId) : 0
  const projectIdNum = projectId ? parseInt(projectId) : 0

  const { wikiPage, isLoading, refetch } = useGetWikiPage(pageIdNum)
  const { changes: pendingChanges } = usePendingChanges(pageIdNum)
  const updateWikiPage = useUpdateWikiPage()
  const updateWikiPageContent = useUpdateWikiPageContent()
  const updateWikiPageStatus = useUpdateWikiPageStatus()
  const deleteWikiPage = useDeleteWikiPage()

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading wiki page...</p>
        </div>
      </div>
    )
  }

  if (!wikiPage) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">Wiki Page Not Found</h3>
          <p className="text-red-700 mb-4">The wiki page you're looking for doesn't exist or you don't have access.</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/wiki`)}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Back to Wiki
          </button>
        </div>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this wiki page?')) return

    try {
      await deleteWikiPage.mutateAsync({
        pageId: pageIdNum,
        projectId: projectIdNum,
      })
      navigate(`/projects/${projectId}/wiki`)
    } catch (error) {
      console.error('Failed to delete wiki page:', error)
    }
  }

  const handleStatusChange = async (status: string) => {
    try {
      await updateWikiPageStatus.mutateAsync({
        pageId: pageIdNum,
        projectId: projectIdNum,
        data: { status },
      })
      refetch()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleStartEditContent = () => {
    setEditedContent(wikiPage.content || '')
    setIsEditingContent(true)
  }

  const handleSaveContent = async () => {
    try {
      await updateWikiPageContent.mutateAsync({
        pageId: pageIdNum,
        projectId: projectIdNum,
        data: { content: editedContent },
      })
      setIsEditingContent(false)
      refetch()
    } catch (error) {
      console.error('Failed to update content:', error)
    }
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Breadcrumb */}
      <nav className="mb-4">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <button onClick={() => navigate(`/projects/${projectId}/wiki`)} className="hover:text-blue-600">
              Wiki
            </button>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{wikiPage.title}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{wikiPage.title}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(wikiPage.status)}`}>
                {WikiPageStatusDisplay[wikiPage.status] || wikiPage.status}
              </span>
              <span className="text-sm text-gray-500">v{wikiPage.version}</span>
            </div>
            <div className="text-sm text-gray-500 mb-4">/{wikiPage.slug}</div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span>Created by:</span>
                <UserLabel userId={wikiPage.createdBy} />
                <span>on {new Date(wikiPage.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Last updated by:</span>
                <UserLabel userId={wikiPage.updatedBy} />
                <span>on {new Date(wikiPage.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {pendingChanges.length > 0 && (
              <button
                onClick={() => setShowChangesPanel(true)}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {pendingChanges.length} Pending Changes
              </button>
            )}
            <button
              onClick={() => setShowChangesPanel(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              History
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Edit Details
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
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Content</h2>
          {!isEditingContent && (
            <button
              onClick={handleStartEditContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Edit Content
            </button>
          )}
        </div>
        
        {isEditingContent ? (
          <div className="p-4">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter wiki page content (HTML supported)"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setIsEditingContent(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContent}
                disabled={updateWikiPageContent.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {updateWikiPageContent.isPending ? 'Saving...' : 'Save Content'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {wikiPage.content ? (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: wikiPage.content }}
              />
            ) : (
              <div className="text-gray-500 text-center py-8">
                <p>No content yet. Click "Edit Content" to add content.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Details Modal */}
      {isEditing && (
        <EditWikiPageForm
          wikiPage={wikiPage}
          projectId={projectIdNum}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false)
            refetch()
          }}
          updateWikiPage={updateWikiPage}
        />
      )}

      {/* Changes Panel */}
      {showChangesPanel && (
        <WikiPageChangesPanel
          pageId={pageIdNum}
          projectId={projectIdNum}
          onClose={() => setShowChangesPanel(false)}
          onMergeComplete={refetch}
        />
      )}
    </div>
  )
}
