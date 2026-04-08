import { useMutation } from '@tanstack/react-query'
import { postSecureApi } from '../apis/fetch'

export interface AddCompletedItemsToReleaseResponse {
  featuresUpdated: number
  issuesUpdated: number
  tasksUpdated: number
}

export function useAddCompletedItemsToRelease() {
  return useMutation({
    mutationFn: async ({ sprintId, releaseId }: { sprintId: number; releaseId: number }) => {
      return postSecureApi<AddCompletedItemsToReleaseResponse>(`/api/sprints/${sprintId}/completed-items/release`, {
        releaseId,
      })
    },
  })
}