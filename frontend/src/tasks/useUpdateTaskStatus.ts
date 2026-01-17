import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateTaskStatusRequest, TaskResponse } from './taskTypes'

interface UpdateTaskStatusParams extends UpdateTaskStatusRequest {
  taskId: number
  projectId: number
}

export function useUpdateTaskStatus() {
  return useMutation({
    mutationFn: async ({ taskId, status }: UpdateTaskStatusParams) => {
      return fetchApi<TaskResponse>(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }, true)
    },
  })
}
