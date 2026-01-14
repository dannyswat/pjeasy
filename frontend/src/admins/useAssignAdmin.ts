import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { AssignAdminRequest } from './adminTypes'

interface AssignAdminResponse {
  id: number
  userId: number
  createdAt: string
  expiredAfter?: string
  message: string
}

/**
 * Hook to assign admin role to a user
 */
export function useAssignAdmin() {
  const mutation = useMutation<AssignAdminResponse, Error, AssignAdminRequest>({
    mutationFn: async (data: AssignAdminRequest) => {
      return fetchApi<AssignAdminResponse>('/api/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })

  return {
    assignAdmin: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
