import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { SprintResponse } from './sprintTypes'

interface UseGetActiveSprintParams {
  projectId: number
}

export function useGetActiveSprint({ projectId }: UseGetActiveSprintParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<SprintResponse | null>({
    queryKey: ['sprint', 'active', projectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        projectId: projectId.toString(),
      })

      return fetchApi<SprintResponse | null>(`/api/sprints/active?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
  })

  return {
    sprint: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
