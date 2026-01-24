import { useMutation, useQueryClient } from '@tanstack/react-query'
import { putSecureApi } from '../apis/fetch'
import type { UpdateFeatureRequest, FeatureResponse } from './featureTypes'

interface UpdateFeatureParams extends UpdateFeatureRequest {
  featureId: number
  projectId: number
}

export function useUpdateFeature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ featureId, projectId, ...data }: UpdateFeatureParams) => {
      return putSecureApi<FeatureResponse>(`/api/features/${featureId}`, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['feature', variables.featureId] })
    },
  })
}
