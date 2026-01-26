import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateSprintRequest, SprintResponse } from './sprintTypes'

interface UpdateSprintParams extends UpdateSprintRequest {
  sprintId: number
}

export function useUpdateSprint() {
  return useMutation({
    mutationFn: async (data: UpdateSprintParams) => {
      const { sprintId, ...updateData } = data
      return fetchApi<SprintResponse>(`/api/sprints/${sprintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }, true)
    },
  })
}
