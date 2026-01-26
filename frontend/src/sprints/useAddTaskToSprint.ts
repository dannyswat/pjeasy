import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { TaskResponse } from '../tasks/taskTypes'

interface AddTaskToSprintParams {
  sprintId: number
  taskId: number
}

export function useAddTaskToSprint() {
  return useMutation({
    mutationFn: async ({ sprintId, taskId }: AddTaskToSprintParams) => {
      return fetchApi<TaskResponse>(`/api/sprints/${sprintId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      }, true)
    },
  })
}
