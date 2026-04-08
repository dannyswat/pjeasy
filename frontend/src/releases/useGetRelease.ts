import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReleaseResponse } from './releaseTypes'

export function useGetRelease(releaseId: number | null) {
  const { data, isLoading, isError, error, refetch } = useQuery<ReleaseResponse>({
    queryKey: ['release', releaseId],
    queryFn: async () => {
      return fetchApi<ReleaseResponse>(`/api/releases/${releaseId}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!releaseId,
  })

  return {
    release: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
