import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ProjectWithMembersResponse } from './projectTypes'

export function useGetProject(projectId: number | null) {
  const { data, isLoading, isError, error, refetch } = useQuery<ProjectWithMembersResponse>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      
      return fetchApi<ProjectWithMembersResponse>(`/api/projects/${projectId}`, {
        method: 'GET',
      }, true)
    },
    enabled: !!projectId,
    retry: 1,
  })

  return {
    project: data?.project ?? null,
    members: data?.members ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
