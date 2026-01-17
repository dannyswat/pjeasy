import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface DeleteTaskParams {
  taskId: number
  projectId: number
}

export function useDeleteTask() {
  return useMutation({
    mutationFn: async ({ taskId, projectId }: DeleteTaskParams) => {
      return fetchApi<void>(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      }, true)
    },
  })
}
