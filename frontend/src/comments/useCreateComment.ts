import { useMutation } from '@tanstack/react-query'
import { postSecureApi } from '../apis/fetch'
import type { CreateCommentRequest, CommentResponse } from './commentTypes'

interface CreateCommentParams {
  itemId: number
  itemType: string
  content: string
}

export function useCreateComment() {
  return useMutation({
    mutationFn: async ({ itemId, itemType, content }: CreateCommentParams) => {
      const request: CreateCommentRequest = { content }
      
      const data = await postSecureApi<CommentResponse>(`/api/${itemType}/${itemId}/comments`, request);
      return data
    },
    onError: (error) => {
      console.error('Failed to create comment:', error)
    },
  })
}
