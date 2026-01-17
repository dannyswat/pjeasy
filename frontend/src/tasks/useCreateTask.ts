import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateTaskRequest, TaskResponse } from './taskTypes'

export function useCreateTask() {
  return useMutation({
    mutationFn: async (data: CreateTaskRequest) => {
      return fetchApi<TaskResponse>(`/api/projects/${data.projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
