import type { TaskResponse } from '../tasks/taskTypes'

export interface SprintResponse {
  id: number
  projectId: number
  name: string
  goal: string
  startDate?: string
  endDate?: string
  milestoneId?: number
  status: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateSprintRequest {
  projectId: number
  name: string
  goal?: string
  startDate?: string
  endDate?: string
  milestoneId?: number
}

export interface UpdateSprintRequest {
  name: string
  goal?: string
  startDate?: string
  endDate?: string
  milestoneId?: number
}

export interface CloseSprintRequest {
  createNewSprint: boolean
  newSprintName?: string
  newSprintGoal?: string
  newSprintEndDate?: string
}

export interface AddTaskToSprintRequest {
  taskId: number
}

export interface SprintListResponse {
  sprints: SprintResponse[]
  total: number
  page: number
  size: number
}

export interface CloseSprintResponse {
  closedSprint: SprintResponse
  newSprint?: SprintResponse
}

export interface SprintBoardResponse {
  sprint: SprintResponse
  tasksByStatus: Record<string, TaskResponse[]>
}

export interface SprintSwimlaneResponse {
  sprint: SprintResponse
  tasksByAssignee: Record<number, TaskResponse[]>
  unassignedTasks: TaskResponse[]
}

export const SprintStatus = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
} as const

export const SprintStatusDisplay = {
  [SprintStatus.PLANNING]: 'Planning',
  [SprintStatus.ACTIVE]: 'Active',
  [SprintStatus.CLOSED]: 'Closed',
}

export type SprintStatusType = typeof SprintStatus[keyof typeof SprintStatus]
