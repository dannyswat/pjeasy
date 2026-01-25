import { useQuery } from '@tanstack/react-query'
import { getSecureApi } from '../apis/fetch'
import type { WikiPageResponse } from './wikiTypes'

export function useGetWikiPage(pageId: number) {
  const query = useQuery({
    queryKey: ['wikiPage', pageId],
    queryFn: async () => {
      return getSecureApi<WikiPageResponse>(`/api/wiki/${pageId}`)
    },
    enabled: !!pageId,
  })

  return {
    wikiPage: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useGetWikiPageBySlug(projectId: number, slug: string) {
  const query = useQuery({
    queryKey: ['wikiPage', 'slug', projectId, slug],
    queryFn: async () => {
      return getSecureApi<WikiPageResponse>(`/api/projects/${projectId}/wiki/slug/${slug}`)
    },
    enabled: !!projectId && !!slug,
  })

  return {
    wikiPage: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
