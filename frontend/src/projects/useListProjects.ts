import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ProjectsListResponse } from './projectTypes'

interface UseListProjectsParams {
  page?: number
  pageSize?: number
  includeArchived?: boolean
}

export function useListProjects({ page = 1, pageSize = 20, includeArchived = false }: UseListProjectsParams = {}) {
  const { data, isLoading, isError, error, refetch } = useQuery<ProjectsListResponse>({
    queryKey: ['projects', page, pageSize, includeArchived],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        includeArchived: includeArchived.toString(),
      })

      return fetchApi<ProjectsListResponse>(`/api/projects?${params}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
  })

  return {
    projects: data?.projects ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
