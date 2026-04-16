import { useMutation } from '@tanstack/react-query'
import { postSecureApi } from '../apis/fetch'
import type { CreateItemFollowUpRequest, ItemFollowUpResponse } from './itemFollowUpTypes'

interface CreateItemFollowUpParams {
  itemId: number
  itemType: string
  followUpDate: string
  content: string
}

export function useCreateItemFollowUp() {
  return useMutation({
    mutationFn: async ({ itemId, itemType, followUpDate, content }: CreateItemFollowUpParams) => {
      const request: CreateItemFollowUpRequest = { followUpDate, content }
      return postSecureApi<ItemFollowUpResponse>(`/api/item-follow-ups/${itemType}/${itemId}`, request)
    },
    onError: (error) => {
      console.error('Failed to create item follow-up:', error)
    },
  })
}