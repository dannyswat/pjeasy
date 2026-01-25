import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSecureApi, postSecureApi } from '../apis/fetch'
import type { 
  WikiPageChangeResponse, 
  WikiPageChangesListResponse, 
  CreateWikiPageChangeRequest,
  ResolveConflictRequest,
  MergeChangesRequest,
  PreviewMergeResponse,
} from './wikiTypes'

// Hook to list changes for a wiki page
export function useListWikiPageChanges(pageId: number, page = 1, pageSize = 20) {
  const query = useQuery({
    queryKey: ['wikiPageChanges', pageId, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      return getSecureApi<WikiPageChangesListResponse>(
        `/api/wiki/${pageId}/changes?${params.toString()}`
      )
    },
    enabled: !!pageId,
  })

  return {
    changes: query.data?.changes ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? pageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// Hook to get pending changes for a wiki page
export function usePendingChanges(pageId: number) {
  const query = useQuery({
    queryKey: ['wikiPageChanges', 'pending', pageId],
    queryFn: async () => {
      return getSecureApi<WikiPageChangeResponse[]>(
        `/api/wiki/${pageId}/changes/pending`
      )
    },
    enabled: !!pageId,
  })

  return {
    changes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// Hook to get changes by item (feature or issue)
export function useChangesByItem(itemType: string, itemId: number) {
  const query = useQuery({
    queryKey: ['wikiPageChanges', 'byItem', itemType, itemId],
    queryFn: async () => {
      const params = new URLSearchParams({
        itemType,
        itemId: itemId.toString(),
      })
      return getSecureApi<WikiPageChangeResponse[]>(
        `/api/wiki-changes?${params.toString()}`
      )
    },
    enabled: !!itemType && !!itemId,
  })

  return {
    changes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// Hook to get a single change
export function useGetWikiPageChange(changeId: number) {
  const query = useQuery({
    queryKey: ['wikiPageChange', changeId],
    queryFn: async () => {
      return getSecureApi<WikiPageChangeResponse>(
        `/api/wiki-changes/${changeId}`
      )
    },
    enabled: !!changeId,
  })

  return {
    change: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// Hook to preview merge
export function usePreviewMerge(changeId: number) {
  const query = useQuery({
    queryKey: ['wikiPageChange', 'preview', changeId],
    queryFn: async () => {
      return getSecureApi<PreviewMergeResponse>(
        `/api/wiki-changes/${changeId}/preview`
      )
    },
    enabled: !!changeId,
  })

  return {
    content: query.data?.content ?? '',
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// Hook to create a wiki page change
interface CreateChangeParams {
  pageId: number
  projectId: number
  data: CreateWikiPageChangeRequest
}

export function useCreateWikiPageChange() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pageId, data }: CreateChangeParams) => {
      return postSecureApi<WikiPageChangeResponse>(
        `/api/wiki/${pageId}/changes`,
        data
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPageChanges', variables.pageId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageChanges', 'pending', variables.pageId] })
      queryClient.invalidateQueries({ 
        queryKey: ['wikiPageChanges', 'byItem', variables.data.itemType, variables.data.itemId] 
      })
    },
  })
}

// Hook to resolve a conflict
interface ResolveConflictParams {
  changeId: number
  pageId: number
  data: ResolveConflictRequest
}

export function useResolveConflict() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ changeId, data }: ResolveConflictParams) => {
      return postSecureApi<WikiPageChangeResponse>(
        `/api/wiki-changes/${changeId}/resolve`,
        data
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPageChange', variables.changeId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageChanges', variables.pageId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageChanges', 'pending', variables.pageId] })
    },
  })
}

// Hook to reject a change
interface RejectChangeParams {
  changeId: number
  pageId: number
}

export function useRejectChange() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ changeId }: RejectChangeParams) => {
      return postSecureApi<WikiPageChangeResponse>(
        `/api/wiki-changes/${changeId}/reject`,
        {}
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPageChange', variables.changeId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageChanges', variables.pageId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageChanges', 'pending', variables.pageId] })
    },
  })
}

// Hook to merge changes
interface MergeChangesParams {
  projectId: number
  data: MergeChangesRequest
}

export function useMergeChanges() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ data }: MergeChangesParams) => {
      return postSecureApi<{ message: string }>(
        `/api/wiki-changes/merge`,
        data
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wikiPages', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['wikiPage'] })
      queryClient.invalidateQueries({ queryKey: ['wikiPageChanges'] })
    },
  })
}
