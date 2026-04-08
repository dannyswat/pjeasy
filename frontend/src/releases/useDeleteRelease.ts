import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'

export function useDeleteRelease() {
  return useMutation({
    mutationFn: async ({ releaseId }: { releaseId: number }) => {
      return fetchApi(`/api/releases/${releaseId}`, {
        method: 'DELETE',
      }, true)
    },
  })
}
