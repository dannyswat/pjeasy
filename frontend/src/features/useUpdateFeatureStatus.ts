import { useMutation, useQueryClient } from '@tanstack/react-query'
import { patchSecureApi } from '../apis/fetch'
import type { FeatureResponse } from './featureTypes'

interface UpdateFeatureStatusParams {
  featureId: number
  projectId: number
  status: string
}

export function useUpdateFeatureStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ featureId, status }: UpdateFeatureStatusParams) => {
      return patchSecureApi<FeatureResponse>(`/api/features/${featureId}/status`, {
        status,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['feature', variables.featureId] })
    },
  })
}
