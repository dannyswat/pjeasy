import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postSecureApi } from '../apis/fetch'
import type { WikiPageResponse, CreateWikiPageRequest } from './wikiTypes'

interface CreateWikiPageParams {
  projectId: number
  data: CreateWikiPageRequest
}

export function useCreateWikiPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, data }: CreateWikiPageParams) => {
      return postSecureApi<WikiPageResponse>(
        `/api/projects/${projectId}/wiki`,
        data
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPages', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageTree', variables.projectId] })
    },
  })
}
