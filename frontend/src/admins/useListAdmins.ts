import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { AdminResponse } from './adminTypes'

/**
 * Hook to fetch all system admins
 */
export function useListAdmins() {
  const accessToken = localStorage.getItem('access_token')

  const { data, isLoading, isError, error, refetch } = useQuery<AdminResponse[]>({
    queryKey: ['admins'],
    queryFn: async () => {
      return fetchApi<AdminResponse[]>('/api/admins', {
        method: 'GET',
      }, true)
    },
    enabled: !!accessToken,
    retry: 1,
  })

  return {
    admins: data ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
