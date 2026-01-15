import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { IdeaResponse } from './ideaTypes'

interface UpdateIdeaStatusParams {
  ideaId: number
  projectId: number
  status: string
}

export function useUpdateIdeaStatus() {
  const queryClient = useQueryClient()

  return useMutation<IdeaResponse, Error, UpdateIdeaStatusParams>({
    mutationFn: async ({ ideaId, status }: UpdateIdeaStatusParams) => {
      return fetchApi<IdeaResponse>(`/api/ideas/${ideaId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] })
    },
  })
}
