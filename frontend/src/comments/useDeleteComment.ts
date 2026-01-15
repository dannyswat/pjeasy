import { useMutation } from '@tanstack/react-query'
import { deleteSecureApi } from '../apis/fetch'

interface DeleteCommentParams {
  commentId: number
}

export function useDeleteComment() {
  return useMutation({
    mutationFn: async ({ commentId }: DeleteCommentParams) => {
      await deleteSecureApi(`/api/comments/${commentId}`);
    },
    onError: (error) => {
      console.error('Failed to delete comment:', error)
    },
  })
}
