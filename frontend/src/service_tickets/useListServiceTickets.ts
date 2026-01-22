import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ServiceTicketsListResponse } from './serviceTicketTypes'

interface UseListServiceTicketsParams {
  projectId: number
  page?: number
  pageSize?: number
  status?: string
  priority?: string
  sortBy?: string
}

export function useListServiceTickets({ projectId, page = 1, pageSize = 20, status, priority, sortBy = 'priority' }: UseListServiceTicketsParams) {
  const { data, isLoading, isError, error, refetch } = useQuery<ServiceTicketsListResponse>({
    queryKey: ['serviceTickets', projectId, page, pageSize, status, priority, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy: sortBy,
      })

      if (status) {
        params.append('status', status)
      }

      if (priority) {
        params.append('priority', priority)
      }

      return fetchApi<ServiceTicketsListResponse>(`/api/projects/${projectId}/service-tickets?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!projectId,
  })

  return {
    serviceTickets: data?.serviceTickets ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
