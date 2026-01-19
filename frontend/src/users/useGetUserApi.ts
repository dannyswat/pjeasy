import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { UserResponse } from '../auth/userResponse'

export function useGetUser(userId: number) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const data = await getSecureApi<UserResponse>(`/api/users/${userId}`)
      return data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (formerly cacheTime)
    enabled: userId > 0,
  })
}
