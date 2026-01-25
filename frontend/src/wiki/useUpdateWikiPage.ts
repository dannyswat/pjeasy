import { useMutation, useQueryClient } from '@tanstack/react-query'
import { putSecureApi } from '../apis/fetch'
import type { WikiPageResponse, UpdateWikiPageRequest, UpdateWikiPageContentRequest, UpdateWikiPageStatusRequest } from './wikiTypes'

interface UpdateWikiPageParams {
  pageId: number
  projectId: number
  data: UpdateWikiPageRequest
}

interface UpdateWikiPageContentParams {
  pageId: number
  projectId: number
  data: UpdateWikiPageContentRequest
}

interface UpdateWikiPageStatusParams {
  pageId: number
  projectId: number
  data: UpdateWikiPageStatusRequest
}

export function useUpdateWikiPage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pageId, data }: UpdateWikiPageParams) => {
      return putSecureApi<WikiPageResponse>(`/api/wiki/${pageId}`, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPage', variables.pageId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPages', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageTree', variables.projectId] })
    },
  })
}

export function useUpdateWikiPageContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pageId, data }: UpdateWikiPageContentParams) => {
      return putSecureApi<WikiPageResponse>(`/api/wiki/${pageId}/content`, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPage', variables.pageId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPages', variables.projectId] })
    },
  })
}

export function useUpdateWikiPageStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pageId, data }: UpdateWikiPageStatusParams) => {
      return putSecureApi<WikiPageResponse>(`/api/wiki/${pageId}/status`, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPage', variables.pageId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPages', variables.projectId] })
    },
  })
}
