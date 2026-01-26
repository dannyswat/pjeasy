import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { SprintSwimlaneResponse } from './sprintTypes'

interface UseGetSprintSwimlaneParams {
  sprintId: number
}

export function useGetSprintSwimlane({ sprintId }: UseGetSprintSwimlaneParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<SprintSwimlaneResponse>({
    queryKey: ['sprint', sprintId, 'swimlane'],
    queryFn: async () => {
      return fetchApi<SprintSwimlaneResponse>(`/api/sprints/${sprintId}/swimlane`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!sprintId,
  })

  return {
    sprint: data?.sprint,
    tasksByAssignee: data?.tasksByAssignee ?? {},
    unassignedTasks: data?.unassignedTasks ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
