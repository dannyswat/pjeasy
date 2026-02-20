import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReviewListResponse } from './reviewTypes'

interface UseListReviewsParams {
  projectId: number
  page?: number
  pageSize?: number
}

export function useListReviews({ projectId, page = 1, pageSize = 20 }: UseListReviewsParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<ReviewListResponse>({
    queryKey: ['reviews', projectId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        projectId: projectId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      return fetchApi<ReviewListResponse>(`/api/reviews?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
  })

  return {
    reviews: data?.reviews ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.size ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
