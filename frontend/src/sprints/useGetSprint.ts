import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { SprintResponse } from './sprintTypes'

interface UseGetSprintParams {
  sprintId: number
}

export function useGetSprint({ sprintId }: UseGetSprintParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<SprintResponse>({
    queryKey: ['sprint', sprintId],
    queryFn: async () => {
      return fetchApi<SprintResponse>(`/api/sprints/${sprintId}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!sprintId,
  })

  return {
    sprint: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
