import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { TaskResponse } from './taskTypes'

export function useGetTask(taskId: number | undefined) {
  const { data, isLoading, isError, error, refetch } = useQuery<TaskResponse>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      return fetchApi<TaskResponse>(`/api/tasks/${taskId}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!taskId,
  })

  return {
    task: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
