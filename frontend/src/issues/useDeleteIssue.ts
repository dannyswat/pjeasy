import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface DeleteIssueParams {
  issueId: number
  projectId: number
}

export function useDeleteIssue() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteIssueParams>({
    mutationFn: async ({ issueId }: DeleteIssueParams) => {
      await fetchApi<void>(`/api/issues/${issueId}`, {
        method: 'DELETE',
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues', variables.projectId] })
    },
  })
}
