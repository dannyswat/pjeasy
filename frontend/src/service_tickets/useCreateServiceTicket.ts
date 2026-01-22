import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateServiceTicketRequest, ServiceTicketResponse } from './serviceTicketTypes'

interface CreateServiceTicketParams extends CreateServiceTicketRequest {
  projectId: number
}

export function useCreateServiceTicket() {
  const queryClient = useQueryClient()

  return useMutation<ServiceTicketResponse, Error, CreateServiceTicketParams>({
    mutationFn: async ({ projectId, ...request }: CreateServiceTicketParams) => {
      return fetchApi<ServiceTicketResponse>(`/api/projects/${projectId}/service-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['serviceTickets', variables.projectId] })
    },
  })
}
