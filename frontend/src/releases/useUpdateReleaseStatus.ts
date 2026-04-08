import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReleaseResponse } from './releaseTypes'

export function useUpdateReleaseStatus() {
  return useMutation({
    mutationFn: async ({ releaseId, status }: { releaseId: number; status: string }) => {
      return fetchApi<ReleaseResponse>(`/api/releases/${releaseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }, true)
    },
  })
}
