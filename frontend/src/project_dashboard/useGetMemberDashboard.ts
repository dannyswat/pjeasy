import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { MemberDashboardResponse } from './dashboardTypes'

export function useGetMemberDashboard(projectId: number) {
  const { data, isLoading, isError, error, refetch } = useQuery<MemberDashboardResponse>({
    queryKey: ['memberDashboard', projectId],
    queryFn: async () => {
      return fetchApi<MemberDashboardResponse>(`/api/projects/${projectId}/dashboard/member`, {
        method: 'GET',
      }, true)
    },
    enabled: projectId > 0,
    staleTime: 30 * 1000, // 30 seconds
  })

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  }
}
