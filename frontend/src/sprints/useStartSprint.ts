import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { SprintResponse } from './sprintTypes'

interface StartSprintParams {
  sprintId: number
}

export function useStartSprint() {
  return useMutation({
    mutationFn: async ({ sprintId }: StartSprintParams) => {
      return fetchApi<SprintResponse>(`/api/sprints/${sprintId}/start`, {
        method: 'POST',
      }, true)
    },
  })
}
