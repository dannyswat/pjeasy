import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { FeaturesListResponse } from './featureTypes'

interface ListFeaturesParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string | string[]
  priority?: string
}

export function useListFeatures({ projectId, page = 1, pageSize = 20, status, priority }: ListFeaturesParams) {
  const query = useQuery({
    queryKey: ['features', projectId, page, pageSize, status, priority],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (status) {
        // Support both single status and array of statuses
        const statusValue = Array.isArray(status) ? status.join(',') : status
        params.append('status', statusValue)
      }
      if (priority) params.append('priority', priority)

      return getSecureApi<FeaturesListResponse>(
        `/api/projects/${projectId}/features?${params.toString()}`
      )
    },
    enabled: !!projectId,
  })

  return {
    features: query.data?.features ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? pageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
