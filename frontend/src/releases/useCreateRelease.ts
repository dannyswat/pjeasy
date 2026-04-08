import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { CreateReleaseRequest, ReleaseResponse } from './releaseTypes'

export function useCreateRelease() {
  return useMutation({
    mutationFn: async ({ projectId, ...data }: CreateReleaseRequest & { projectId: number }) => {
      return fetchApi<ReleaseResponse>(`/api/projects/${projectId}/releases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, true)
    },
  })
}
