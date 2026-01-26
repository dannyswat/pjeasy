import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { TaskResponse } from '../tasks/taskTypes'

interface RemoveTaskFromSprintParams {
  sprintId: number
  taskId: number
}

export function useRemoveTaskFromSprint() {
  return useMutation({
    mutationFn: async ({ sprintId, taskId }: RemoveTaskFromSprintParams) => {
      return fetchApi<TaskResponse>(`/api/sprints/${sprintId}/tasks/${taskId}`, {
        method: 'DELETE',
      }, true)
    },
  })
}
