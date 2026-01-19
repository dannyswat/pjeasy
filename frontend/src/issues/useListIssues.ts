import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { IssuesListResponse } from './issueTypes'

interface UseListIssuesParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string
  priority?: string
}

export function useListIssues({ projectId, page = 1, pageSize = 20, status, priority }: UseListIssuesParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<IssuesListResponse>({
    queryKey: ['issues', projectId, page, pageSize, status, priority],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      if (status) {
        params.append('status', status)
      }

      if (priority) {
        params.append('priority', priority)
      }

      return fetchApi<IssuesListResponse>(`/api/projects/${projectId}/issues?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
  })

  return {
    issues: data?.issues ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
