import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReleaseCandidateItemResponse } from './releaseTypes'

export function useGetReleaseCandidateItems(projectId: number, releaseId?: number | null, enabled = true, excludeDone = false, linkedOnly = false) {
  const { data, isLoading, isError, error, refetch } = useQuery<ReleaseCandidateItemResponse[]>({
    queryKey: ['releaseCandidateItems', projectId, releaseId ?? null, excludeDone, linkedOnly],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (releaseId) {
        params.set('releaseId', releaseId.toString())
      }
      if (excludeDone) {
        params.set('excludeDone', 'true')
      }
      if (linkedOnly) {
        params.set('linkedOnly', 'true')
      }

      const suffix = params.toString() ? `?${params.toString()}` : ''
      return fetchApi<ReleaseCandidateItemResponse[]>(`/api/projects/${projectId}/releases/candidates${suffix}`, {
        method: 'GET',
      }, true)
    },
    enabled: enabled && projectId > 0,
    retry: 1,
  })

  return {
    items: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}