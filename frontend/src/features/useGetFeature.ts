import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { FeatureResponse } from './featureTypes'

export function useGetFeature(featureId: number) {
  const query = useQuery({
    queryKey: ['feature', featureId],
    queryFn: async () => {
      return getSecureApi<FeatureResponse>(`/api/features/${featureId}`)
    },
    enabled: !!featureId,
  })

  return {
    feature: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
