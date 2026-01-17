export interface TaskResponse {
  id: number
  refNum: string
  projectId: number
  title: string
  description: string
  status: string
  priority: string
  estimatedHours: number
  assigneeId?: number
  deadline?: string
  sprintId?: number
  tags?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  projectId: number
  title: string
  description: string
  status?: string
  priority?: string
  estimatedHours?: number
  assigneeId?: number
  deadline?: string
  sprintId?: number
  tags?: string
}

export interface UpdateTaskRequest {
  title: string
  description: string
  priority?: string
  estimatedHours?: number
  assigneeId?: number
  deadline?: string
  sprintId?: number
  tags?: string
}

export interface UpdateTaskStatusRequest {
  status: string
}

export interface UpdateTaskAssigneeRequest {
  assigneeId?: number
}

export interface TasksListResponse {
  tasks: TaskResponse[]
  total: number
  page: number
  size: number
}

export const TaskStatus = {
  OPEN: 'Open',
  IN_PROGRESS: 'InProgress',
  ON_HOLD: 'OnHold',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
} as const

export const TaskStatusDisplay = {
  [TaskStatus.OPEN]: 'Open',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.ON_HOLD]: 'On Hold',
  [TaskStatus.BLOCKED]: 'Blocked',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CLOSED]: 'Closed',
}

export const TaskPriority = {
  IMMEDIATE: 'Immediate',
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',
} as const

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus]
export type TaskPriorityType = typeof TaskPriority[keyof typeof TaskPriority]
