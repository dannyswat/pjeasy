import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { ConfirmedReleaseItem, ReleaseResponse } from './releaseTypes'

export function useCompleteRelease() {
  return useMutation({
    mutationFn: async ({ releaseId, confirmedItems }: { releaseId: number; confirmedItems: ConfirmedReleaseItem[] }) => {
      return fetchApi<ReleaseResponse>(`/api/releases/${releaseId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedItems }),
      }, true)
    },
  })
}
