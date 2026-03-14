import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReviewResponse } from './reviewTypes'

export function usePublishReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reviewId: number) => {
      return fetchApi<ReviewResponse>(`/api/reviews/${reviewId}/publish`, {
        method: 'POST',
      }, true)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['review', data.id] })
      queryClient.invalidateQueries({ queryKey: ['reviews', data.projectId] })
      queryClient.invalidateQueries({ queryKey: ['statusChanges', data.projectId, 'review', data.id] })
    },
  })
}
