import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSecureApi, getSecureApi, postSecureApi, putSecureApi } from '../apis/fetch'
import type { StatusFlowRequest, StatusFlowResponse } from './statusFlowTypes'

export function useStatusFlows(projectId: number | null) {
  const query = useQuery<StatusFlowResponse[]>({
    queryKey: ['statusFlows', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      return getSecureApi<StatusFlowResponse[]>(`/api/projects/${projectId}/status-flows`)
    },
    enabled: !!projectId,
    retry: 1,
  })

  return {
    statusFlows: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  }
}

export function useCreateStatusFlow() {
  const queryClient = useQueryClient()

  const mutation = useMutation<StatusFlowResponse, Error, { projectId: number; data: StatusFlowRequest }>({
    mutationFn: async ({ projectId, data }) => {
      return postSecureApi<StatusFlowResponse>(`/api/projects/${projectId}/status-flows`, data)
    },
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ['statusFlows', flow.projectId] })
    },
  })

  return {
    createStatusFlow: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateStatusFlow() {
  const queryClient = useQueryClient()

  const mutation = useMutation<StatusFlowResponse, Error, { projectId: number; flowId: number; data: StatusFlowRequest }>({
    mutationFn: async ({ projectId, flowId, data }) => {
      return putSecureApi<StatusFlowResponse>(`/api/projects/${projectId}/status-flows/${flowId}`, data)
    },
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ['statusFlows', flow.projectId] })
    },
  })

  return {
    updateStatusFlow: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteStatusFlow() {
  const queryClient = useQueryClient()

  const mutation = useMutation<void, Error, { projectId: number; flowId: number }>({
    mutationFn: async ({ projectId, flowId }) => {
      await deleteSecureApi(`/api/projects/${projectId}/status-flows/${flowId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['statusFlows', variables.projectId] })
    },
  })

  return {
    deleteStatusFlow: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}