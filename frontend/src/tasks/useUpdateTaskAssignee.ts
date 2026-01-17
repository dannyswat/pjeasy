import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateTaskAssigneeRequest, TaskResponse } from './taskTypes'

interface UpdateTaskAssigneeParams extends UpdateTaskAssigneeRequest {
  taskId: number
  projectId: number
}

export function useUpdateTaskAssignee() {
  return useMutation({
    mutationFn: async ({ taskId, assigneeId }: UpdateTaskAssigneeParams) => {
      return fetchApi<TaskResponse>(`/api/tasks/${taskId}/assignee`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigneeId }),
      }, true)
    },
  })
}
