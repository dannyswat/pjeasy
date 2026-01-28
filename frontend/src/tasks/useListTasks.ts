import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { TasksListResponse } from './taskTypes'

interface UseListTasksParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string | string[]
}

export function useListTasks({ projectId, page = 1, pageSize = 20, status }: UseListTasksParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<TasksListResponse>({
    queryKey: ['tasks', projectId, page, pageSize, status],
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

      return fetchApi<TasksListResponse>(`/api/projects/${projectId}/tasks?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
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
