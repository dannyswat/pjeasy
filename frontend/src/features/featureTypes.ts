export interface FeatureResponse {
  id: number
  refNum: string
  projectId: number
  title: string
  description: string
  status: string
  priority: string
  assignedTo?: number
  sprintId?: number
  points: number
  deadline?: string
  itemType?: string
  itemId?: number
  tags?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateFeatureRequest {
  title: string
  description: string
  priority?: string
  assignedTo?: number
  sprintId?: number
  points?: number
  deadline?: string
  itemType?: string
  itemId?: number
  tags?: string
}

export interface UpdateFeatureRequest {
  title: string
  description: string
  priority?: string
  assignedTo?: number
  sprintId?: number
  points?: number
  deadline?: string
  tags?: string
}

export interface UpdateFeatureStatusRequest {
  status: string
}

export interface UpdateFeatureAssigneeRequest {
  assignedTo: number
}

export interface FeaturesListResponse {
  features: FeatureResponse[]
  total: number
  page: number
  pageSize: number
}

export const FeatureStatus = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'InProgress',
  IN_REVIEW: 'InReview',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
} as const

export const FeatureStatusDisplay: Record<string, string> = {
  Open: 'Open',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  InReview: 'In Review',
  Completed: 'Completed',
  Closed: 'Closed',
}

export const FeaturePriority = {
  IMMEDIATE: 'Immediate',
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',
} as const

export type FeatureStatusType = typeof FeatureStatus[keyof typeof FeatureStatus]
export type FeaturePriorityType = typeof FeaturePriority[keyof typeof FeaturePriority]
