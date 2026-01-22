export interface IdeaResponse {
  id: number
  refNum: string
  projectId: number
  title: string
  description: string
  status: string // 'Open' | 'Closed'
  itemType?: string
  itemId?: number
  tags?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateIdeaRequest {
  title: string
  description: string
  itemType?: string
  itemId?: number
  tags?: string
}

export interface UpdateIdeaRequest {
  title: string
  description: string
  tags?: string
}

export interface UpdateIdeaStatusRequest {
  status: string
}

export interface IdeasListResponse {
  ideas: IdeaResponse[]
  total: number
  page: number
  pageSize: number
}

export const IdeaStatus = {
  OPEN: 'Open',
  CLOSED: 'Closed',
} as const

export type IdeaStatusType = typeof IdeaStatus[keyof typeof IdeaStatus]
