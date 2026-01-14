import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateProjectRequest, ProjectResponse } from './projectTypes'

export function useCreateProject() {
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
  })

  return {
    createProject: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
