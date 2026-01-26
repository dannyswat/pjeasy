import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CloseSprintRequest, CloseSprintResponse } from './sprintTypes'

interface CloseSprintParams extends CloseSprintRequest {
  sprintId: number
}

export function useCloseSprint() {
  return useMutation({
    mutationFn: async (data: CloseSprintParams) => {
      const { sprintId, ...closeData } = data
      return fetchApi<CloseSprintResponse>(`/api/sprints/${sprintId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(closeData),
      }, true)
    },
  })
}
