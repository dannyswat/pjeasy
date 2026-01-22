import { useState } from 'react'
import { useListIssuesByItem } from './useListIssuesByItem'
import { useCreateIssue } from './useCreateIssue'
import { type IssueResponse, IssueStatusDisplay } from './issueTypes'
import CreateIssueForm from './CreateIssueForm'
import { UserLabel } from '../components/UserLabel'

interface RelatedIssuesProps {
  projectId: number
  itemType: string
  itemId: number
  itemRefNum?: string
  itemTitle?: string
  itemPriority?: string
}

export default function RelatedIssues({ projectId, itemType, itemId }: RelatedIssuesProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { issues, isLoading, refetch } = useListIssuesByItem({ projectId, itemType, itemId, pageSize: 50 })
  const createIssue = useCreateIssue()

  const handleCreateIssue = async (data: {
    title: string
    description: string
    priority: string
    assignedTo?: number
    points: number
    tags: string
  }) => {
    try {
      await createIssue.mutateAsync({
        projectId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedTo: data.assignedTo,
        points: data.points,
        itemType,
        itemId,
        tags: data.tags,
      })
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to create issue:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Immediate':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Urgent':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'Normal':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Low':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'Closed':
        return 'bg-gray-50 text-gray-600 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Related Issues</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center"
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Issue
        </button>
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueForm
          projectId={projectId}
          onSubmit={handleCreateIssue}
          onCancel={() => setShowCreateModal(false)}
          isPending={createIssue.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center">
          <p className="text-xs text-gray-500">No related issues yet. Create one using the button above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue: IssueResponse) => (
            <div
              key={issue.id}
              className="bg-gray-50 border border-gray-200 rounded p-3 hover:bg-gray-100 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      <span className="text-gray-500 mr-1.5 text-xs">[{issue.refNum}]</span>
                      {issue.title}
                    </h4>
                  </div>
                  {issue.tags && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {issue.tags.split(',').map((tag, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-700 border border-red-200 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  {issue.assignedTo && (
                    <span className="text-xs text-gray-600">
                      👤 <UserLabel userId={issue.assignedTo} />
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(issue.priority)}`}>
                    {issue.priority}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(issue.status)}`}>
                    {IssueStatusDisplay[issue.status as keyof typeof IssueStatusDisplay]}
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
