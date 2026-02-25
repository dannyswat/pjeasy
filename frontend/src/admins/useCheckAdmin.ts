import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'

/**
 * Hook to check if the current user is a system admin
 */
export function useCheckAdmin() {
  const accessToken = localStorage.getItem('access_token')

  const { data, isLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['admin-check'],
    queryFn: async () => {
      return getSecureApi<{ isAdmin: boolean }>('/api/admins/check')
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  })

  return {
    isAdmin: data?.isAdmin ?? false,
    isLoading,
  }
}
