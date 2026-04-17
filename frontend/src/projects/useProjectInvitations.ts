import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type {
  AcceptProjectInvitationResponse,
  CreateProjectInvitationRequest,
  ProjectInvitationListResponse,
  ProjectInvitationResponse,
} from './projectTypes'

interface CreateProjectInvitationParams {
  projectId: number
  data: CreateProjectInvitationRequest
}

export function useCreateProjectInvitation() {
  const queryClient = useQueryClient()

  const mutation = useMutation<ProjectInvitationResponse, Error, CreateProjectInvitationParams>({
    mutationFn: async ({ projectId, data }) => {
      return fetchApi<ProjectInvitationResponse>(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectInvitations', variables.projectId] })
    },
  })

  return {
    createProjectInvitation: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

export function useListProjectInvitations(projectId: number | null) {
  return useQuery<ProjectInvitationListResponse>({
    queryKey: ['projectInvitations', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      return fetchApi<ProjectInvitationListResponse>(`/api/projects/${projectId}/invitations`, {
        method: 'GET',
      }, true)
    },
    enabled: !!projectId,
  })
}

export function useGetProjectInvitation(token: string | null) {
  return useQuery<ProjectInvitationResponse>({
    queryKey: ['projectInvitation', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('Invitation token is required')
      }

      return fetchApi<ProjectInvitationResponse>(`/api/project-invitations/${token}`, {
        method: 'GET',
      })
    },
    enabled: !!token,
    retry: false,
  })
}

export function useAcceptProjectInvitation() {
  const queryClient = useQueryClient()

  const mutation = useMutation<AcceptProjectInvitationResponse, Error, string>({
    mutationFn: async (token: string) => {
      return fetchApi<AcceptProjectInvitationResponse>(`/api/project-invitations/${token}/accept`, {
        method: 'POST',
      }, true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  return {
    acceptProjectInvitation: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

interface RevokeProjectInvitationParams {
  projectId: number
  invitationId: number
}

export function useRevokeProjectInvitation() {
  const queryClient = useQueryClient()

  const mutation = useMutation<{ message: string }, Error, RevokeProjectInvitationParams>({
    mutationFn: async ({ projectId, invitationId }) => {
      return fetchApi<{ message: string }>(`/api/projects/${projectId}/invitations/${invitationId}`, {
        method: 'DELETE',
      }, true)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectInvitations', variables.projectId] })
    },
  })

  return {
    revokeProjectInvitation: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}