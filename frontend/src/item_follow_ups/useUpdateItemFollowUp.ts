import { useMutation } from '@tanstack/react-query'
import { putSecureApi } from '../apis/fetch'
import type { ItemFollowUpResponse, UpdateItemFollowUpRequest } from './itemFollowUpTypes'

interface UpdateItemFollowUpParams {
  followUpId: number
  followUpDate: string
  content: string
}

export function useUpdateItemFollowUp() {
  return useMutation({
    mutationFn: async ({ followUpId, followUpDate, content }: UpdateItemFollowUpParams) => {
      const request: UpdateItemFollowUpRequest = { followUpDate, content }
      return putSecureApi<ItemFollowUpResponse>(`/api/item-follow-ups/${followUpId}`, request)
    },
    onError: (error) => {
      console.error('Failed to update item follow-up:', error)
    },
  })
}