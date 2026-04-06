import { useMutation, useQueryClient } from '@tanstack/react-query'
import { patchSecureApi } from '../apis/fetch'
import type { BatchUpdateFeatureStatusRequest, FeatureResponse } from './featureTypes'

interface BatchUpdateFeatureStatusParams extends BatchUpdateFeatureStatusRequest {
  projectId: number
}

interface BatchUpdateFeatureStatusResponse {
  features: FeatureResponse[]
}

export function useBatchUpdateFeatureStatus() {
  const queryClient = useQueryClient()

  return useMutation<BatchUpdateFeatureStatusResponse, Error, BatchUpdateFeatureStatusParams>({
    mutationFn: async ({ projectId, ...request }: BatchUpdateFeatureStatusParams) => {
      return patchSecureApi<BatchUpdateFeatureStatusResponse>(`/api/projects/${projectId}/features/status`, request)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features', variables.projectId] })
      for (const featureId of variables.featureIds) {
        queryClient.invalidateQueries({ queryKey: ['feature', featureId] })
        queryClient.invalidateQueries({ queryKey: ['statusChanges', variables.projectId, 'feature', featureId] })
      }
    },
  })
}