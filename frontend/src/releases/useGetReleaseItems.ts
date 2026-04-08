import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReleaseItemResponse } from './releaseTypes'

export function useGetReleaseItems(releaseId: number | null) {
  const { data, isLoading, isError, error, refetch } = useQuery<ReleaseItemResponse[]>({
    queryKey: ['releaseItems', releaseId],
    queryFn: async () => {
      return fetchApi<ReleaseItemResponse[]>(`/api/releases/${releaseId}/items`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!releaseId,
  })

  return {
    items: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
