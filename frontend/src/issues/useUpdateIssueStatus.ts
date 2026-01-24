import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateIssueStatusRequest, IssueResponse } from './issueTypes'

interface UpdateIssueStatusParams extends UpdateIssueStatusRequest {
  issueId: number
  projectId: number
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient()

  return useMutation<IssueResponse, Error, UpdateIssueStatusParams>({
    mutationFn: async ({ issueId, ...request }: UpdateIssueStatusParams) => {
      return fetchApi<IssueResponse>(`/api/issues/${issueId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] })
    },
  })
}
