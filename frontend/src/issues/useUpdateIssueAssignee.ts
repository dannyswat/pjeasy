import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateIssueAssigneeRequest, IssueResponse } from './issueTypes'

interface UpdateIssueAssigneeParams extends UpdateIssueAssigneeRequest {
  issueId: number
  projectId: number
}

export function useUpdateIssueAssignee() {
  const queryClient = useQueryClient()

  return useMutation<IssueResponse, Error, UpdateIssueAssigneeParams>({
    mutationFn: async ({ issueId, ...request }: UpdateIssueAssigneeParams) => {
      return fetchApi<IssueResponse>(`/api/issues/${issueId}/assignee`, {
        method: 'PATCH',
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
