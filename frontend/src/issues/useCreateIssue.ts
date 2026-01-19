import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateIssueRequest, IssueResponse } from './issueTypes'

interface CreateIssueParams extends CreateIssueRequest {
  projectId: number
}

export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation<IssueResponse, Error, CreateIssueParams>({
    mutationFn: async ({ projectId, ...request }: CreateIssueParams) => {
      return fetchApi<IssueResponse>(`/api/projects/${projectId}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues', variables.projectId] })
    },
  })
}
