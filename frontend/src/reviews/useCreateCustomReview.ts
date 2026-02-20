import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateCustomReviewRequest, ReviewResponse } from './reviewTypes'

export function useCreateCustomReview() {
  return useMutation({
    mutationFn: async (data: CreateCustomReviewRequest) => {
      return fetchApi<ReviewResponse>(`/api/reviews/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
