export interface ReleaseResponse {
  id: number
  version: string
  projectId: number
  description: string
  status: string
  targetDate?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateReleaseRequest {
  version: string
  description?: string
  targetDate?: string
}

export interface UpdateReleaseRequest {
  version: string
  description?: string
  targetDate?: string
}

export interface UpdateReleaseStatusRequest {
  status: string
}

export interface ConfirmedReleaseItem {
  id: number
  itemType: string
}

export interface CompleteReleaseRequest {
  confirmedItems: ConfirmedReleaseItem[]
}

export interface ReleasesListResponse {
  releases: ReleaseResponse[]
  total: number
  page: number
  pageSize: number
}

export interface ReleaseItemResponse {
  id: number
  refNum: string
  title: string
  status: string
  itemType: string
}

export const ReleaseStatus = {
  OPEN: 'Open',
  IN_UAT: 'InUAT',
  COMPLETED: 'Completed',
  ON_HOLD: 'OnHold',
  ABANDONED: 'Abandoned',
  ROLLED_BACK: 'RolledBack',
} as const

export const ReleaseStatusDisplay: Record<string, string> = {
  Open: 'Open',
  InUAT: 'In UAT',
  Completed: 'Completed',
  OnHold: 'On Hold',
  Abandoned: 'Abandoned',
  RolledBack: 'Rolled Back',
}

export type ReleaseStatusType = typeof ReleaseStatus[keyof typeof ReleaseStatus]
