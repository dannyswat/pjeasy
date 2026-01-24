import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSecureApi } from '../apis/fetch'

interface DeleteFeatureParams {
  featureId: number
  projectId: number
}

export function useDeleteFeature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ featureId }: DeleteFeatureParams) => {
      return deleteSecureApi(`/api/features/${featureId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features', variables.projectId] })
    },
  })
}
