import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReviewResponse } from './reviewTypes'

export function useRegenerateReview() {
  return useMutation({
    mutationFn: async (reviewId: number) => {
      return fetchApi<ReviewResponse>(`/api/reviews/${reviewId}/regenerate`, {
        method: 'POST',
      }, true)
    },
  })
}
