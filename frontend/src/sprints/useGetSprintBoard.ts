import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { SprintBoardResponse } from './sprintTypes'

interface UseGetSprintBoardParams {
  sprintId: number
}

export function useGetSprintBoard({ sprintId }: UseGetSprintBoardParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<SprintBoardResponse>({
    queryKey: ['sprint', sprintId, 'board'],
    queryFn: async () => {
      return fetchApi<SprintBoardResponse>(`/api/sprints/${sprintId}/board`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!sprintId,
  })

  return {
    sprint: data?.sprint,
    tasksByStatus: data?.tasksByStatus ?? {},
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
