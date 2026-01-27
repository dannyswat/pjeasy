import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ManagerDashboardResponse } from './dashboardTypes'

export function useGetManagerDashboard(projectId: number) {
  const { data, isLoading, isError, error, refetch } = useQuery<ManagerDashboardResponse>({
    queryKey: ['managerDashboard', projectId],
    queryFn: async () => {
      return fetchApi<ManagerDashboardResponse>(`/api/projects/${projectId}/dashboard/manager`, {
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
