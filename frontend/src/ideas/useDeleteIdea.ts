import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface DeleteIdeaParams {
  ideaId: number
  projectId: number
}

export function useDeleteIdea() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, Error, DeleteIdeaParams>({
    mutationFn: async ({ ideaId }: DeleteIdeaParams) => {
      return fetchApi<{ message: string }>(`/api/ideas/${ideaId}`, {
        method: 'DELETE',
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', variables.projectId] })
    },
  })
}
