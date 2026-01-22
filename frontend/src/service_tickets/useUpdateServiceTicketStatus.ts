import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ServiceTicketResponse } from './serviceTicketTypes'

interface UpdateServiceTicketStatusParams {
  ticketId: number
  projectId: number
  status: string
}

export function useUpdateServiceTicketStatus() {
  const queryClient = useQueryClient()

  return useMutation<ServiceTicketResponse, Error, UpdateServiceTicketStatusParams>({
    mutationFn: async ({ ticketId, status }: UpdateServiceTicketStatusParams) => {
      return fetchApi<ServiceTicketResponse>(`/api/service-tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serviceTickets', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['serviceTicket', variables.ticketId] })
    },
  })
}
