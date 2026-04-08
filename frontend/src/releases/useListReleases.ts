import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReleasesListResponse } from './releaseTypes'

interface UseListReleasesParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string
}

export function useListReleases({ projectId, page = 1, pageSize = 20, status }: UseListReleasesParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<ReleasesListResponse>({
    queryKey: ['releases', projectId, page, pageSize, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (status) {
        params.set('status', status)
      }

      return fetchApi<ReleasesListResponse>(`/api/projects/${projectId}/releases?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
  })

  return {
    releases: data?.releases ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
