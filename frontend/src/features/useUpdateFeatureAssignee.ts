import { useMutation, useQueryClient } from '@tanstack/react-query'
import { patchSecureApi } from '../apis/fetch'
import type { FeatureResponse } from './featureTypes'

interface UpdateFeatureAssigneeParams {
  featureId: number
  projectId: number
  assignedTo: number
}

export function useUpdateFeatureAssignee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ featureId, assignedTo }: UpdateFeatureAssigneeParams) => {
      return patchSecureApi<FeatureResponse>(`/api/features/${featureId}/assignee`, {
        assignedTo,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['feature', variables.featureId] })
    },
  })
}
