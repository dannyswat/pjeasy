import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ProjectsListResponse } from './projectTypes'

export function useArchiveProject() {
  const queryClient = useQueryClient()

  const mutation = useMutation<{ message: string }, Error, number>({
    mutationFn: async (projectId: number) => {
      return fetchApi<{ message: string }>(`/api/projects/${projectId}/archive`, {
        method: 'POST',
      }, true)
    },
    onSuccess: (_, archivedProjectId) => {
      queryClient.setQueriesData<ProjectsListResponse>({ queryKey: ['projects'] }, (oldData) => {
        if (!oldData) return oldData

        const filteredProjects = oldData.projects.filter((project) => project.id !== archivedProjectId)
        if (filteredProjects.length === oldData.projects.length) return oldData

        return {
          ...oldData,
          projects: filteredProjects,
          total: Math.max(0, oldData.total - 1),
        }
      })

      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', archivedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['memberDashboard', archivedProjectId] })
      queryClient.invalidateQueries({ queryKey: ['managerDashboard', archivedProjectId] })
    },
  })

  return {
    archiveProject: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

export function useUnarchiveProject() {
  const mutation = useMutation<{ message: string }, Error, number>({
    mutationFn: async (projectId: number) => {
      return fetchApi<{ message: string }>(`/api/projects/${projectId}/unarchive`, {
        method: 'POST',
      }, true)
    },
  })

  return {
    unarchiveProject: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
