import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postSecureApi } from '../apis/fetch'
import type { CreateFeatureRequest, FeatureResponse } from './featureTypes'

interface CreateFeatureParams extends CreateFeatureRequest {
  projectId: number
}

export function useCreateFeature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, ...data }: CreateFeatureParams) => {
      return postSecureApi<FeatureResponse>(
        `/api/projects/${projectId}/features`,
        data
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features', variables.projectId] })
    },
  })
}
