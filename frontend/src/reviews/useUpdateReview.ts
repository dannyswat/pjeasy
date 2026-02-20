import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateReviewRequest, ReviewResponse } from './reviewTypes'

export function useUpdateReview() {
  return useMutation({
    mutationFn: async ({ reviewId, data }: { reviewId: number; data: UpdateReviewRequest }) => {
      return fetchApi<ReviewResponse>(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
