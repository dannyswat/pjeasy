import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { IdeasListResponse } from './ideaTypes'

interface UseListIdeasParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string | string[]
}

export function useListIdeas({ projectId, page = 1, pageSize = 20, status }: UseListIdeasParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<IdeasListResponse>({
    queryKey: ['ideas', projectId, page, pageSize, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      if (status) {
        // Support both single status and array of statuses
        const statusValue = Array.isArray(status) ? status.join(',') : status
        params.append('status', statusValue)
      }

      return fetchApi<IdeasListResponse>(`/api/projects/${projectId}/ideas?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
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
