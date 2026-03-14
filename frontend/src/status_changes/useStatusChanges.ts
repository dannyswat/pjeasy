import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { StatusChangeResponse } from './statusChangeTypes'

export function useStatusChanges(projectId: number, itemType: string, itemId: number, enabled = true) {
  const query = useQuery({
    queryKey: ['statusChanges', projectId, itemType, itemId],
    queryFn: async () => {
      const params = new URLSearchParams({
        projectId: projectId.toString(),
        itemType,
        itemId: itemId.toString(),
      })

      return getSecureApi<StatusChangeResponse[]>(`/api/status-changes?${params.toString()}`)
    },
    enabled: enabled && projectId > 0 && itemId > 0 && itemType.length > 0,
  })

  return {
    changes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}