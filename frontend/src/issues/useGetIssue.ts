import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { IssueResponse } from './issueTypes'

export function useGetIssue(issueId: number) {
  const { data, isLoading, isError, error, refetch } = useQuery<IssueResponse>({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      return fetchApi<IssueResponse>(`/api/issues/${issueId}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!issueId,
  })

  return {
    issue: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
