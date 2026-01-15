import { useState } from 'react'
import { useListComments } from './useListComments'
import { useCreateComment } from './useCreateComment'
import { useUpdateComment } from './useUpdateComment'
import { useDeleteComment } from './useDeleteComment'
import type { CommentResponse } from './commentTypes'

interface CommentsProps {
  itemId: number
  itemType: string
}

export default function Comments({ itemId, itemType }: CommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const { comments, isLoading, refetch } = useListComments(itemId, itemType)
  const createComment = useCreateComment()
  const updateComment = useUpdateComment()
  const deleteComment = useDeleteComment()

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await createComment.mutateAsync({
        itemId,
        itemType,
        content: newComment,
      })
      setNewComment('')
      refetch()
    } catch (error) {
      console.error('Failed to create comment:', error)
    }
  }

  const handleStartEdit = (comment: CommentResponse) => {
    setEditingCommentId(comment.id)
    setEditingContent(comment.content)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingContent('')
  }

  const handleSaveEdit = async (commentId: number) => {
    if (!editingContent.trim()) return

    try {
      await updateComment.mutateAsync({
        commentId,
        content: editingContent,
      })
      setEditingCommentId(null)
      setEditingContent('')
      refetch()
    } catch (error) {
      console.error('Failed to update comment:', error)
    }
  }

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    try {
      await deleteComment.mutateAsync({ commentId })
      refetch()
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Comments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                {editingCommentId === comment.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Edit your comment..."
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={!editingContent.trim() || updateComment.isPending}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updateComment.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                        {comment.createdAt !== comment.updatedAt && (
                          <span className="ml-2 italic">(edited)</span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStartEdit(comment)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Comment Form */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Add a comment</h4>
        <form onSubmit={handleSubmitNew} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="Write your comment here..."
          />
          <button
            type="submit"
            disabled={!newComment.trim() || createComment.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createComment.isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
      </div>
    </div>
  )
}
