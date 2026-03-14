export interface StatusChangeResponse {
  id: number
  projectId: number
  itemType: string
  itemId: number
  oldStatus: string
  newStatus: string
  changedBy?: number | null
  changedAt: string
}