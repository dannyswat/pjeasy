import { useMutation } from '@tanstack/react-query'
import { deleteSecureApi } from '../apis/fetch'

interface DeleteItemFollowUpParams {
  followUpId: number
}

export function useDeleteItemFollowUp() {
  return useMutation({
    mutationFn: async ({ followUpId }: DeleteItemFollowUpParams) => {
      await deleteSecureApi(`/api/item-follow-ups/${followUpId}`)
    },
    onError: (error) => {
      console.error('Failed to delete item follow-up:', error)
    },
  })
}