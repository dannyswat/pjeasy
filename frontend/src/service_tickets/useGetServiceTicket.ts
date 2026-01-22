import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ServiceTicketResponse } from './serviceTicketTypes'

export function useGetServiceTicket(ticketId: number) {
  const { data, isLoading, isError, error, refetch } = useQuery<ServiceTicketResponse>({
    queryKey: ['serviceTicket', ticketId],
    queryFn: async () => {
      return fetchApi<ServiceTicketResponse>(`/api/service-tickets/${ticketId}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!ticketId && ticketId > 0,
  })

  return {
    serviceTicket: data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
