import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface DeleteSprintParams {
  sprintId: number
}

export function useDeleteSprint() {
  return useMutation({
    mutationFn: async ({ sprintId }: DeleteSprintParams) => {
      return fetchApi<void>(`/api/sprints/${sprintId}`, {
        method: 'DELETE',
      }, true)
    },
  })
}
