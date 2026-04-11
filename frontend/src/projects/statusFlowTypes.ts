export type StatusFlowItemType =
  | 'idea'
  | 'issue'
  | 'feature'
  | 'task'
  | 'service-ticket'
  | 'wiki-page'
  | 'sprint'
  | 'review'
  | 'release'

export interface StatusFlowResponse {
  id: number
  projectId: number
  itemType: StatusFlowItemType
  fromStatus?: string | null
  toStatuses: string[]
  disabled: boolean
  createdAt: string
  updatedAt: string
}

export interface StatusFlowRequest {
  itemType: StatusFlowItemType
  fromStatus?: string | null
  toStatuses: string[]
  disabled: boolean
}

export const STATUS_FLOW_ITEM_TYPES: Array<{ value: StatusFlowItemType; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'issue', label: 'Issue' },
  { value: 'feature', label: 'Feature' },
  { value: 'task', label: 'Task' },
  { value: 'service-ticket', label: 'Service Ticket' },
  { value: 'wiki-page', label: 'Wiki Page' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'review', label: 'Review' },
  { value: 'release', label: 'Release' },
]

export const STATUS_OPTIONS_BY_ITEM_TYPE: Record<StatusFlowItemType, string[]> = {
  idea: ['Open', 'Closed'],
  issue: ['Open', 'Assigned', 'InProgress', 'InReview', 'Completed', 'Rejected', 'Reopened', 'Closed'],
  feature: ['Open', 'Assigned', 'InProgress', 'InReview', 'Completed', 'Rejected', 'Reopened', 'Closed'],
  task: ['Open', 'In Progress', 'On Hold', 'Blocked', 'Completed', 'Rejected', 'Reopened', 'Closed'],
  'service-ticket': ['New', 'Open', 'Fulfilled', 'Closed'],
  'wiki-page': ['Draft', 'Published', 'Archived'],
  sprint: ['Planning', 'Active', 'Closed'],
  review: ['Draft', 'Published'],
  release: ['Open', 'InUAT', 'Completed', 'OnHold', 'Abandoned', 'RolledBack'],
}

export function getStatusFlowItemTypeLabel(itemType: StatusFlowItemType): string {
  return STATUS_FLOW_ITEM_TYPES.find((entry) => entry.value === itemType)?.label ?? itemType
}