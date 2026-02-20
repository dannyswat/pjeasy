import { useParams, useNavigate } from 'react-router-dom'
import { useGetReviewDetail } from './useGetReviewDetail'
import { usePublishReview } from './usePublishReview'
import { useRegenerateReview } from './useRegenerateReview'
import { useDeleteReview } from './useDeleteReview'
import {
  ReviewStatus,
  ReviewStatusDisplay,
  ReviewItemCategory,
  ReviewItemCategoryDisplay,
  ReviewItemTypeDisplay,
} from './reviewTypes'
import type { ReviewItemResponse } from './reviewTypes'

export default function ReviewDetailPage() {
  const { projectId, reviewId } = useParams<{ projectId: string; reviewId: string }>()
  const navigate = useNavigate()
  const reviewIdNum = reviewId ? parseInt(reviewId) : 0
  const { review, items, isLoading, refetch } = useGetReviewDetail(reviewIdNum)
  const publishReview = usePublishReview()
  const regenerateReview = useRegenerateReview()
  const deleteReview = useDeleteReview()

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-900 mb-2">Review Not Found</h3>
          <button
            onClick={() => navigate(`/projects/${projectId}/reviews`)}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Back to Reviews
          </button>
        </div>
      </div>
    )
  }

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this review? Published reviews cannot be edited.')) return
    try {
      await publishReview.mutateAsync(reviewIdNum)
      refetch()
    } catch (error) {
      console.error('Failed to publish review:', error)
    }
  }

  const handleRegenerate = async () => {
    if (!window.confirm('This will refresh all review items with the latest data. Continue?')) return
    try {
      await regenerateReview.mutateAsync(reviewIdNum)
      refetch()
    } catch (error) {
      console.error('Failed to regenerate review:', error)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this review?')) return
    try {
      await deleteReview.mutateAsync(reviewIdNum)
      navigate(`/projects/${projectId}/reviews`)
    } catch (error) {
      console.error('Failed to delete review:', error)
    }
  }

  const completedItems = items.filter((i) => i.category === ReviewItemCategory.COMPLETED)
  const inProgressItems = items.filter((i) => i.category === ReviewItemCategory.IN_PROGRESS)
  const delayedItems = items.filter((i) => i.category === ReviewItemCategory.DELAYED)
  const prioritizationItems = items.filter((i) => i.category === ReviewItemCategory.PRIORITIZATION)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ReviewStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case ReviewStatus.PUBLISHED:
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-100 text-blue-700'
      case 'issue':
        return 'bg-red-100 text-red-700'
      case 'task':
        return 'bg-gray-100 text-gray-700'
      case 'idea':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const renderItemRow = (item: ReviewItemResponse) => (
    <tr key={`${item.itemType}-${item.itemId}`} className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getItemTypeBadge(item.itemType)}`}>
          {ReviewItemTypeDisplay[item.itemType as keyof typeof ReviewItemTypeDisplay] || item.itemType}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.refNum || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.title}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.status}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.priority || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.points || '-'}</td>
    </tr>
  )

  const renderItemSection = (title: string, sectionItems: ReviewItemResponse[], colorClass: string, icon: string) => {
    if (sectionItems.length === 0) return null
    return (
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <span className={`text-lg mr-2`}>{icon}</span>
          <h3 className={`text-lg font-semibold ${colorClass}`}>
            {title} ({sectionItems.length})
          </h3>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Ref</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Priority</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sectionItems.map(renderItemRow)}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back Navigation */}
      <button
        onClick={() => navigate(`/projects/${projectId}/reviews`)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Reviews
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{review.title}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(review.status)}`}>
              {ReviewStatusDisplay[review.status as keyof typeof ReviewStatusDisplay]}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-indigo-100 text-indigo-800 border-indigo-200">
              {review.reviewType}
            </span>
          </div>
          {review.description && (
            <p className="text-gray-600 mb-2">{review.description}</p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {review.startDate && (
              <span>Period: {review.startDate}{review.endDate && ` - ${review.endDate}`}</span>
            )}
            <span>Created: {new Date(review.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        {review.status === ReviewStatus.DRAFT && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRegenerate}
              className="px-4 py-2 text-sm text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition"
              disabled={regenerateReview.isPending}
            >
              {regenerateReview.isPending ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handlePublish}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
              disabled={publishReview.isPending}
            >
              {publishReview.isPending ? 'Publishing...' : 'Publish'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{review.totalTasks}</div>
          <div className="text-sm text-gray-500 mt-1">Total Items</div>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{review.completedTasks}</div>
          <div className="text-sm text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{review.completionRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-500 mt-1">Completion Rate</div>
        </div>
        <div className="bg-white rounded-lg border border-purple-200 p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{review.totalPoints}</div>
          <div className="text-sm text-gray-500 mt-1">Total Points</div>
        </div>
        <div className="bg-white rounded-lg border border-indigo-200 p-4 text-center">
          <div className="text-3xl font-bold text-indigo-600">{review.completedPoints}</div>
          <div className="text-sm text-gray-500 mt-1">Completed Points</div>
        </div>
      </div>

      {/* Completion Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-500">{review.completedTasks} / {review.totalTasks} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(review.completionRate, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Summary */}
      {review.summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{review.summary}</p>
        </div>
      )}

      {/* Item Sections */}
      {renderItemSection(
        ReviewItemCategoryDisplay[ReviewItemCategory.COMPLETED],
        completedItems,
        'text-green-700',
        '✅'
      )}
      {renderItemSection(
        ReviewItemCategoryDisplay[ReviewItemCategory.IN_PROGRESS],
        inProgressItems,
        'text-blue-700',
        '🔄'
      )}
      {renderItemSection(
        ReviewItemCategoryDisplay[ReviewItemCategory.DELAYED],
        delayedItems,
        'text-orange-700',
        '⚠️'
      )}
      {renderItemSection(
        ReviewItemCategoryDisplay[ReviewItemCategory.PRIORITIZATION],
        prioritizationItems,
        'text-purple-700',
        '📋'
      )}

      {items.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No items in this review. Click "Refresh Data" to populate.</p>
        </div>
      )}
    </div>
  )
}
