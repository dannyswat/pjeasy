import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

export function useArchiveProject() {
  const mutation = useMutation<{ message: string }, Error, number>({
    mutationFn: async (projectId: number) => {
      return fetchApi<{ message: string }>(`/api/projects/${projectId}/archive`, {
        method: 'POST',
      }, true)
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
