export interface IssueResponse {
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
  itemType?: string
  itemId?: number
  tags?: string
  cascadeCompletion: boolean
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateIssueRequest {
  title: string
  description: string
  priority?: string
  assignedTo?: number
  sprintId?: number
  points?: number
  itemType?: string
  itemId?: number
  tags?: string
  cascadeCompletion?: boolean
}

export interface UpdateIssueRequest {
  title: string
  description: string
  priority?: string
  assignedTo?: number
  sprintId?: number
  points?: number
  tags?: string
  cascadeCompletion?: boolean
}

export interface UpdateIssueStatusRequest {
  status: string
}

export interface UpdateIssueAssigneeRequest {
  assignedTo: number
}

export interface IssuesListResponse {
  issues: IssueResponse[]
  total: number
  page: number
  pageSize: number
}

export const IssueStatus = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'InProgress',
  IN_REVIEW: 'InReview',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
} as const

export const IssueStatusDisplay: Record<string, string> = {
  Open: 'Open',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  InReview: 'In Review',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Reopened: 'Reopened',
  Closed: 'Closed',
}

export const IssuePriority = {
  IMMEDIATE: 'Immediate',
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',
} as const

export type IssueStatusType = typeof IssueStatus[keyof typeof IssueStatus]
export type IssuePriorityType = typeof IssuePriority[keyof typeof IssuePriority]
