import { useMutation } from '@tanstack/react-query'
import { fetchApi } from '../apis/fetch'
import type { AddMemberRequest } from './projectTypes'

interface AddMemberParams {
  projectId: number
  data: AddMemberRequest
}

export function useAddMember() {
  const mutation = useMutation<{ message: string }, Error, AddMemberParams>({
    mutationFn: async ({ projectId, data }: AddMemberParams) => {
      return fetchApi<{ message: string }>(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }, true)
    },
  })

  return {
    addMember: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}

interface RemoveMemberParams {
  projectId: number
  memberId: number
}

export function useRemoveMember() {
  const mutation = useMutation<{ message: string }, Error, RemoveMemberParams>({
    mutationFn: async ({ projectId, memberId }: RemoveMemberParams) => {
      return fetchApi<{ message: string }>(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      }, true)
    },
  })

  return {
    removeMember: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
