import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { UpdateReleaseRequest, ReleaseResponse } from './releaseTypes'

export function useUpdateRelease() {
  return useMutation({
    mutationFn: async ({ releaseId, ...data }: UpdateReleaseRequest & { releaseId: number }) => {
      return fetchApi<ReleaseResponse>(`/api/releases/${releaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
