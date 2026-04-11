import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ReleaseResponse, ConfirmedReleaseItem } from './releaseTypes'

export function useUpdateReleaseStatus() {
  return useMutation({
    mutationFn: async ({ releaseId, status, confirmedItems }: { releaseId: number; status: string; confirmedItems?: ConfirmedReleaseItem[] }) => {
      return fetchApi<ReleaseResponse>(`/api/releases/${releaseId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, confirmedItems }),
      }, true)
    },
  })
}
