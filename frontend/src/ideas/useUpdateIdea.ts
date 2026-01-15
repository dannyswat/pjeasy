import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateIdeaRequest, IdeaResponse } from './ideaTypes'

interface UpdateIdeaParams extends UpdateIdeaRequest {
  ideaId: number
  projectId: number
}

export function useUpdateIdea() {
  const queryClient = useQueryClient()

  return useMutation<IdeaResponse, Error, UpdateIdeaParams>({
    mutationFn: async ({ ideaId, ...request }: UpdateIdeaParams) => {
      return fetchApi<IdeaResponse>(`/api/ideas/${ideaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['idea', variables.ideaId] })
    },
  })
}
