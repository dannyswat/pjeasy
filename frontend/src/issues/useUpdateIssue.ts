import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateIssueRequest, IssueResponse } from './issueTypes'

interface UpdateIssueParams extends UpdateIssueRequest {
  issueId: number
  projectId: number
}

export function useUpdateIssue() {
  const queryClient = useQueryClient()

  return useMutation<IssueResponse, Error, UpdateIssueParams>({
    mutationFn: async ({ issueId, projectId, ...request }: UpdateIssueParams) => {
      return fetchApi<IssueResponse>(`/api/issues/${issueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] })
    },
  })
}
