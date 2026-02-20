import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

export function useDeleteReview() {
  return useMutation({
    mutationFn: async (reviewId: number) => {
      return fetchApi<{ message: string }>(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      }, true)
    },
  })
}
