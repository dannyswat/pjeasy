export interface ReviewResponse {
  id: number
  projectId: number
  title: string
  description: string
  reviewType: string
  sprintId?: number
  startDate?: string
  endDate?: string
  status: string
  summary: string
  totalTasks: number
  completedTasks: number
  totalPoints: number
  completedPoints: number
  completionRate: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateSprintReviewRequest {
  projectId: number
  sprintId: number
  title: string
  description?: string
}

export interface CreateCustomReviewRequest {
  projectId: number
  title: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface UpdateReviewRequest {
  title: string
  description?: string
  summary?: string
}

export interface ReviewListResponse {
  reviews: ReviewResponse[]
  total: number
  page: number
  size: number
}

export interface ReviewItemResponse {
  id: number
  reviewId: number
  itemType: string
  itemId: number
  refNum: string
  title: string
  status: string
  priority?: string
  assignedTo?: number
  points: number
  category: string
}

export interface ReviewDetailResponse {
  review: ReviewResponse
  items: ReviewItemResponse[]
}

export const ReviewType = {
  SPRINT: 'Sprint',
  CUSTOM: 'Custom',
} as const

export const ReviewStatus = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
} as const

export const ReviewStatusDisplay = {
  [ReviewStatus.DRAFT]: 'Draft',
  [ReviewStatus.PUBLISHED]: 'Published',
}

export const ReviewItemCategory = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  DELAYED: 'delayed',
  PRIORITIZATION: 'prioritization',
} as const

export const ReviewItemCategoryDisplay = {
  [ReviewItemCategory.COMPLETED]: 'Completed',
  [ReviewItemCategory.IN_PROGRESS]: 'In Progress',
  [ReviewItemCategory.DELAYED]: 'Delayed',
  [ReviewItemCategory.PRIORITIZATION]: 'For Prioritization',
}

export const ReviewItemTypeDisplay = {
  feature: 'Feature',
  issue: 'Issue',
  task: 'Task',
  idea: 'Idea',
}

export type ReviewStatusType = typeof ReviewStatus[keyof typeof ReviewStatus]
export type ReviewTypeType = typeof ReviewType[keyof typeof ReviewType]
