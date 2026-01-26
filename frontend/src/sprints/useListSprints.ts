import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { SprintListResponse } from './sprintTypes'

interface UseListSprintsParams {
  projectId: number
  page?: number
  pageSize?: number
}

export function useListSprints({ projectId, page = 1, pageSize = 20 }: UseListSprintsParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<SprintListResponse>({
    queryKey: ['sprints', projectId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        projectId: projectId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      return fetchApi<SprintListResponse>(`/api/sprints?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
  })

  return {
    sprints: data?.sprints ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.size ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
