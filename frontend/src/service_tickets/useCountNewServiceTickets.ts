import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface CountNewServiceTicketsResponse {
  count: number
}

export function useCountNewServiceTickets(projectId: number) {
  const { data, isLoading, isError, error, refetch } = useQuery<CountNewServiceTicketsResponse>({
    queryKey: ['serviceTicketsNewCount', projectId],
    queryFn: async () => {
      return fetchApi<CountNewServiceTicketsResponse>(
        `/api/projects/${projectId}/service-tickets/count-new`,
        { method: 'GET' },
        true
      )
    },
    retry: 1,
    enabled: !!projectId,
    // Refresh every 30 seconds to keep the badge up to date
    refetchInterval: 30000,
  })

  return {
    count: data?.count ?? 0,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
