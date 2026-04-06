import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { BatchUpdateTaskStatusRequest, TaskResponse } from './taskTypes'

interface BatchUpdateTaskStatusParams extends BatchUpdateTaskStatusRequest {
  projectId: number
}

interface BatchUpdateTaskStatusResponse {
  tasks: TaskResponse[]
}

export function useBatchUpdateTaskStatus() {
  const queryClient = useQueryClient()

  return useMutation<BatchUpdateTaskStatusResponse, Error, BatchUpdateTaskStatusParams>({
    mutationFn: async ({ projectId, ...request }: BatchUpdateTaskStatusParams) => {
      return fetchApi<BatchUpdateTaskStatusResponse>(`/api/projects/${projectId}/tasks/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.projectId] })
      for (const taskId of variables.taskIds) {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] })
        queryClient.invalidateQueries({ queryKey: ['statusChanges', variables.projectId, 'task', taskId] })
      }
    },
  })
}