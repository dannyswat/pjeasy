import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateTaskRequest, TaskResponse } from './taskTypes'

interface UpdateTaskParams extends UpdateTaskRequest {
  taskId: number
  projectId: number
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: async ({ taskId, ...data }: UpdateTaskParams) => {
      return fetchApi<TaskResponse>(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
