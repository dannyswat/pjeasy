import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReviewDetailResponse } from './reviewTypes'

export function useGetReviewDetail(reviewId: number) {
  const { data, isLoading, isError, error, refetch } = useQuery<ReviewDetailResponse>({
    queryKey: ['review', reviewId, 'detail'],
    queryFn: async () => {
      return fetchApi<ReviewDetailResponse>(`/api/reviews/${reviewId}/detail`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!reviewId,
  })

  return {
    review: data?.review ?? null,
    items: data?.items ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
