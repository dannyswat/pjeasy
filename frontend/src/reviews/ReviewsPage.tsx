import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListReviews } from './useListReviews'
import { useCreateSprintReview } from './useCreateSprintReview'
import { useCreateCustomReview } from './useCreateCustomReview'
import { useDeleteReview } from './useDeleteReview'
import { usePublishReview } from './usePublishReview'
import { ReviewStatus, ReviewStatusDisplay, ReviewType } from './reviewTypes'
import { useListSprints } from '../sprints/useListSprints'
import CreateReviewForm from './CreateReviewForm'

export default function ReviewsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { reviews, total, isLoading, refetch } = useListReviews({ projectId: projectIdNum, page, pageSize })
  const { sprints } = useListSprints({ projectId: projectIdNum, page: 1, pageSize: 100 })
  const createSprintReview = useCreateSprintReview()
  const createCustomReview = useCreateCustomReview()
  const deleteReview = useDeleteReview()
  const publishReview = usePublishReview()

  const totalPages = Math.ceil(total / pageSize)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view reviews.</p>
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

  const handleCreateSubmit = async (data: {
    type: string
    title: string
    description: string
    sprintId?: number
    startDate?: string
    endDate?: string
  }) => {
    try {
      if (data.type === ReviewType.SPRINT && data.sprintId) {
        await createSprintReview.mutateAsync({
          projectId: projectIdNum,
          sprintId: data.sprintId,
          title: data.title,
          description: data.description,
        })
      } else {
        await createCustomReview.mutateAsync({
          projectId: projectIdNum,
          title: data.title,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
        })
      }
      setShowCreateModal(false)
      refetch()
    } catch (error) {
      console.error('Failed to create review:', error)
    }
  }

  const handlePublish = async (reviewId: number) => {
    if (!window.confirm('Are you sure you want to publish this review? Published reviews cannot be edited.')) return

    try {
      await publishReview.mutateAsync(reviewId)
      refetch()
    } catch (error) {
      console.error('Failed to publish review:', error)
    }
  }

  const handleDelete = async (reviewId: number) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return

    try {
      await deleteReview.mutateAsync(reviewId)
      refetch()
    } catch (error) {
      console.error('Failed to delete review:', error)
    }
  }

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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case ReviewType.SPRINT:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case ReviewType.CUSTOM:
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Reviews</h1>
          <p className="text-gray-600 mt-1">Create and manage project reviews for stakeholder presentations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Review
        </button>
      </div>

      {/* Review List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
          <p className="text-gray-600 mb-4">Create your first review to summarize project progress.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Create Review
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/projects/${projectId}/reviews/${review.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{review.title}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(review.status)}`}>
                      {ReviewStatusDisplay[review.status as keyof typeof ReviewStatusDisplay]}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeBadge(review.reviewType)}`}>
                      {review.reviewType}
                    </span>
                  </div>
                  {review.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{review.description}</p>
                  )}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    {review.startDate && (
                      <span>
                        Period: {review.startDate}
                        {review.endDate && ` - ${review.endDate}`}
                      </span>
                    )}
                    <span>Created: {new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center space-x-4 ml-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{review.completionRate.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">Completion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{review.completedTasks}</div>
                    <div className="text-xs text-gray-500">of {review.totalTasks}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    {review.status === ReviewStatus.DRAFT && (
                      <>
                        <button
                          onClick={() => handlePublish(review.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                          title="Publish"
                        >
                          Publish
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} reviews)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Review Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Create New Review</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CreateReviewForm
              sprints={sprints}
              onSubmit={handleCreateSubmit}
              onCancel={() => setShowCreateModal(false)}
              isSubmitting={createSprintReview.isPending || createCustomReview.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
