import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

interface UnassignAdminResponse {
  message: string
}

/**
 * Hook to unassign admin role from a user
 */
export function useUnassignAdmin() {
  const mutation = useMutation<UnassignAdminResponse, Error, number>({
    mutationFn: async (userId: number) => {
      return fetchApi<UnassignAdminResponse>(`/api/admins/${userId}`, {
        method: 'DELETE',
      }, true)
    },
  })

  return {
    unassignAdmin: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
