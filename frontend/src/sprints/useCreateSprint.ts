import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateSprintRequest, SprintResponse } from './sprintTypes'

export function useCreateSprint() {
  return useMutation({
    mutationFn: async (data: CreateSprintRequest) => {
      return fetchApi<SprintResponse>(`/api/sprints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
