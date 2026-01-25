import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { WikiPageTreeResponse } from './wikiTypes'

export function useWikiPageTree(projectId: number) {
  const query = useQuery({
    queryKey: ['wikiPageTree', projectId],
    queryFn: async () => {
      return getSecureApi<WikiPageTreeResponse>(
        `/api/projects/${projectId}/wiki/tree`
      )
    },
    enabled: !!projectId,
  })

  return {
    wikiPages: query.data?.wikiPages ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
