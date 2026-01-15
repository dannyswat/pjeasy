import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateIdeaRequest, IdeaResponse } from './ideaTypes'

interface CreateIdeaParams extends CreateIdeaRequest {
  projectId: number
}

export function useCreateIdea() {
  const queryClient = useQueryClient()

  return useMutation<IdeaResponse, Error, CreateIdeaParams>({
    mutationFn: async ({ projectId, ...request }: CreateIdeaParams) => {
      return fetchApi<IdeaResponse>(`/api/projects/${projectId}/ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', variables.projectId] })
    },
  })
}
