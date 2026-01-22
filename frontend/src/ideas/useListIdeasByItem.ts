import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { IdeasListResponse } from './ideaTypes'

interface UseListIdeasByItemParams {
  projectId: number
  itemType: string
  itemId: number
  page?: number
  pageSize?: number
}

export function useListIdeasByItem({ projectId, itemType, itemId, page = 1, pageSize = 20 }: UseListIdeasByItemParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<IdeasListResponse>({
    queryKey: ['ideas', 'by-item', projectId, itemType, itemId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        itemType,
        itemId: itemId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      return fetchApi<IdeasListResponse>(`/api/projects/${projectId}/ideas/by-item?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId && !!itemType && !!itemId,
  })

  return {
    ideas: data?.ideas ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
