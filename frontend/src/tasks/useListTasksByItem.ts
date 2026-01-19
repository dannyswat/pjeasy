import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { TasksListResponse } from './taskTypes'

interface UseListTasksByItemParams {
  projectId: number
  itemType: string
  itemId: number
  page?: number
  pageSize?: number
}

export function useListTasksByItem({ projectId, itemType, itemId, page = 1, pageSize = 20 }: UseListTasksByItemParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<TasksListResponse>({
    queryKey: ['tasks', 'by-item', projectId, itemType, itemId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        itemType,
        itemId: itemId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      return fetchApi<TasksListResponse>(`/api/projects/${projectId}/tasks/by-item?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId && !!itemType && !!itemId,
  })

  return {
    tasks: data?.tasks ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.size ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
