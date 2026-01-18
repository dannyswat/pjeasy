import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface DeleteTaskParams {
  taskId: number
}

export function useDeleteTask() {
  return useMutation({
    mutationFn: async ({ taskId }: DeleteTaskParams) => {
      return fetchApi<void>(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      }, true)
    },
  })
}
