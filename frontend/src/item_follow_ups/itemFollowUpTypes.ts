export interface ItemFollowUpResponse {
  id: number
  itemId: number
  itemType: string
  followUpDate: string
  content: string
  createdBy: number
  createdAt: string
  updatedAt: string
  creatorName: string
}

export interface CreateItemFollowUpRequest {
  followUpDate: string
  content: string
}

export interface UpdateItemFollowUpRequest {
  followUpDate: string
  content: string
}

export interface ItemFollowUpsListResponse {
  followUps: ItemFollowUpResponse[]
  total: number
}