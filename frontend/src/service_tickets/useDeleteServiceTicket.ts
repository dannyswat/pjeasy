import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface DeleteServiceTicketParams {
  ticketId: number
  projectId: number
}

export function useDeleteServiceTicket() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, DeleteServiceTicketParams>({
    mutationFn: async ({ ticketId }: DeleteServiceTicketParams) => {
      return fetchApi<void>(`/api/service-tickets/${ticketId}`, {
        method: 'DELETE',
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serviceTickets', variables.projectId] })
    },
  })
}
