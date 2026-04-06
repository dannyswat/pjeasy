import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { BatchUpdateIssueStatusRequest, IssueResponse } from './issueTypes'

interface BatchUpdateIssueStatusParams extends BatchUpdateIssueStatusRequest {
  projectId: number
}

interface BatchUpdateIssueStatusResponse {
  issues: IssueResponse[]
}

export function useBatchUpdateIssueStatus() {
  const queryClient = useQueryClient()

  return useMutation<BatchUpdateIssueStatusResponse, Error, BatchUpdateIssueStatusParams>({
    mutationFn: async ({ projectId, ...request }: BatchUpdateIssueStatusParams) => {
      return fetchApi<BatchUpdateIssueStatusResponse>(`/api/projects/${projectId}/issues/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issues', variables.projectId] })
      for (const issueId of variables.issueIds) {
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] })
        queryClient.invalidateQueries({ queryKey: ['statusChanges', variables.projectId, 'issue', issueId] })
      }
    },
  })
}