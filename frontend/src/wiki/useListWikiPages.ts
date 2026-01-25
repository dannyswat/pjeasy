import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { WikiPageListResponse } from './wikiTypes'

interface ListWikiPagesParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string
}

export function useListWikiPages({ projectId, page = 1, pageSize = 20, status }: ListWikiPagesParams) {
  const query = useQuery({
    queryKey: ['wikiPages', projectId, page, pageSize, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (status) params.append('status', status)

      return getSecureApi<WikiPageListResponse>(
        `/api/projects/${projectId}/wiki?${params.toString()}`
      )
    },
    enabled: !!projectId,
  })

  return {
    wikiPages: query.data?.wikiPages ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? pageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
