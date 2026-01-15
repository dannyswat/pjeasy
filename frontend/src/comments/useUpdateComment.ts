import { useMutation } from '@tanstack/react-query'
import { putSecureApi } from '../apis/fetch'
import type { UpdateCommentRequest, CommentResponse } from './commentTypes'

interface UpdateCommentParams {
  commentId: number
  content: string
}

export function useUpdateComment() {
  return useMutation({
    mutationFn: async ({ commentId, content }: UpdateCommentParams) => {
      const request: UpdateCommentRequest = { content }
      
      const data = await putSecureApi<CommentResponse>(`/api/comments/${commentId}`, request);
      return data
    },
    onError: (error) => {
      console.error('Failed to update comment:', error)
    },
  })
}
