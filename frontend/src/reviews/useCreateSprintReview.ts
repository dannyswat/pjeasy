import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateSprintReviewRequest, ReviewResponse } from './reviewTypes'

export function useCreateSprintReview() {
  return useMutation({
    mutationFn: async (data: CreateSprintReviewRequest) => {
      return fetchApi<ReviewResponse>(`/api/reviews/sprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
