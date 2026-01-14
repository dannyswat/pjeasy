import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UserResponse } from './userResponse'

interface MeApiResult {
  user: UserResponse | null
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Hook to fetch current user info from /api/users/me
 * Automatically uses access token from localStorage
 */
export function useMeApi(): MeApiResult {
  const accessToken = localStorage.getItem('access_token')

  const { data, isLoading, isError, error } = useQuery<UserResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error('No access token')
      }

      const response = await fetchApi<UserResponse>('/api/users/me', {
        method: 'GET',
      }, true)

      return response
    },
    enabled: !!accessToken,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    user: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
  }
}
