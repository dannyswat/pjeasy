import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { IssuesListResponse } from './issueTypes'

interface UseListIssuesByItemParams {
  projectId: number
  itemType: string
  itemId: number
  page?: number
  pageSize?: number
}

export function useListIssuesByItem({ projectId, itemType, itemId, page = 1, pageSize = 20 }: UseListIssuesByItemParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<IssuesListResponse>({
    queryKey: ['issues', 'by-item', projectId, itemType, itemId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        itemType,
        itemId: itemId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      return fetchApi<IssuesListResponse>(`/api/projects/${projectId}/issues/by-item?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId && !!itemType && !!itemId,
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
