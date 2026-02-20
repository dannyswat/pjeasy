import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReviewResponse } from './reviewTypes'

export function usePublishReview() {
  return useMutation({
    mutationFn: async (reviewId: number) => {
      return fetchApi<ReviewResponse>(`/api/reviews/${reviewId}/publish`, {
        method: 'POST',
      }, true)
    },
  })
}
