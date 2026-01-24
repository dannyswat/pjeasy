import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { FeaturesListResponse } from './featureTypes'

interface ListFeaturesByItemParams {
  projectId: number
  itemType: string
  itemId: number
  page?: number
  pageSize?: number
}

export function useListFeaturesByItem({ projectId, itemType, itemId, page = 1, pageSize = 20 }: ListFeaturesByItemParams) {
  const query = useQuery({
    queryKey: ['features', 'by-item', projectId, itemType, itemId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        itemType,
        itemId: itemId.toString(),
        page: page.toString(),
        pageSize: pageSize.toString(),
      })

      return getSecureApi<FeaturesListResponse>(
        `/api/projects/${projectId}/features/by-item?${params.toString()}`
      )
    },
    enabled: !!projectId && !!itemType && !!itemId,
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
