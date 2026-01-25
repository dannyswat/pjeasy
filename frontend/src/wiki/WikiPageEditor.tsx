import { useState } from 'react'
import { useWikiPageTree } from './useWikiPageTree'
import { useCreateWikiPageChange } from './useWikiPageChanges'
import { buildWikiPageTree, type WikiPageResponse, type WikiPageTreeNode } from './wikiTypes'

interface WikiPageEditorProps {
  projectId: number
  itemType: 'feature' | 'issue'
  itemId: number
  onClose: () => void
  onSuccess: () => void
}

export default function WikiPageEditor({ projectId, itemType, itemId, onClose, onSuccess }: WikiPageEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [step, setStep] = useState<'select' | 'edit'>('select')
  const [error, setError] = useState<string | null>(null)

  const { wikiPages, isLoading } = useWikiPageTree(projectId)
  const createChange = useCreateWikiPageChange()

  const tree = buildWikiPageTree(wikiPages)

  const handleSelectPage = (page: WikiPageResponse) => {
    setSelectedPageId(page.id)
    setContent(page.content || '')
    setStep('edit')
  }

  const handleSave = async () => {
    if (!selectedPageId) return
    setError(null)

    try {
      await createChange.mutateAsync({
        pageId: selectedPageId,
        projectId,
        data: {
          itemType,
          itemId,
          content,
        },
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    }
  }

  const renderTreeNode = (node: WikiPageTreeNode, level: number = 0) => (
    <div key={node.id}>
      <button
        onClick={() => handleSelectPage(node)}
        className={`w-full text-left px-3 py-2 hover:bg-blue-50 rounded transition ${
          selectedPageId === node.id ? 'bg-blue-100' : ''
        }`}
        style={{ paddingLeft: `${(level * 16) + 12}px` }}
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm text-gray-900">{node.title}</span>
        </div>
      </button>
      {node.children.map(child => renderTreeNode(child, level + 1))}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 'select' ? 'Select Wiki Page' : 'Edit Wiki Content'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Changes will be linked to this {itemType} and merged when it's completed.
          </p>
        </div>

        {step === 'select' ? (
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : tree.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No wiki pages found. Create a wiki page first.
              </div>
            ) : (
              <div className="space-y-1">
                {tree.map(node => renderTreeNode(node))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            <div className="mb-2">
              <button
                onClick={() => setStep('select')}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Back to page selection
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content (HTML)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="Enter wiki page content (HTML supported)"
            />
          </div>
        )}

        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          {step === 'edit' && (
            <button
              onClick={handleSave}
              disabled={createChange.isPending || !selectedPageId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createChange.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
