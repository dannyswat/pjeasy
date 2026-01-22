import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateServiceTicketRequest, ServiceTicketResponse } from './serviceTicketTypes'

interface UpdateServiceTicketParams extends UpdateServiceTicketRequest {
  ticketId: number
  projectId: number
}

export function useUpdateServiceTicket() {
  const queryClient = useQueryClient()

  return useMutation<ServiceTicketResponse, Error, UpdateServiceTicketParams>({
    mutationFn: async ({ ticketId, ...request }: UpdateServiceTicketParams) => {
      return fetchApi<ServiceTicketResponse>(`/api/service-tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serviceTickets', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['serviceTicket', variables.ticketId] })
    },
  })
}
