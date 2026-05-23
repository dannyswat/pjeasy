import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateProjectRequest, ProjectResponse } from './projectTypes'

interface UpdateProjectParams {
  projectId: number
  data: UpdateProjectRequest
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  const mutation = useMutation<ProjectResponse, Error, UpdateProjectParams>({
    mutationFn: async ({ projectId, data }: UpdateProjectParams) => {
      return fetchApi<ProjectResponse>(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
    onSuccess: (_updatedProject, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  return {
    updateProject: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
