import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSecureApi } from '../apis/fetch'

interface DeleteWikiPageParams {
  pageId: number
  projectId: number
}

export function useDeleteWikiPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pageId }: DeleteWikiPageParams) => {
      return deleteSecureApi<void>(`/api/wiki/${pageId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPages', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageTree', variables.projectId] })
    },
  })
}
