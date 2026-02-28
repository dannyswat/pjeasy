import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateProjectRequest, ProjectResponse, ProjectsListResponse } from './projectTypes'

export function useCreateProject() {
  const queryClient = useQueryClient()

  const mutation = useMutation<ProjectResponse, Error, CreateProjectRequest>({
    mutationFn: async (data: CreateProjectRequest) => {
      return fetchApi<ProjectResponse>('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
    onSuccess: (newProject) => {
      queryClient.setQueriesData<ProjectsListResponse>({ queryKey: ['projects'] }, (oldData) => {
        if (!oldData) return oldData

        const alreadyExists = oldData.projects.some((project) => project.id === newProject.id)
        if (alreadyExists) return oldData

        return {
          ...oldData,
          projects: [newProject, ...oldData.projects],
          total: oldData.total + 1,
        }
      })

      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  return {
    createProject: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
