import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { IdeaResponse } from './ideaTypes'

export function useGetIdea(ideaId: number | null) {
  const { data, isLoading, isError, error, refetch } = useQuery<IdeaResponse>({
    queryKey: ['idea', ideaId],
    queryFn: async () => {
      return fetchApi<IdeaResponse>(`/api/ideas/${ideaId}`, {
        method: 'GET',
      }, true)
    },
    retry: 1,
    enabled: !!ideaId,
  })

  return {
    idea: data ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
