import type { TaskResponse } from '../tasks/taskTypes'
import type { IssueResponse } from '../issues/issueTypes'
import type { FeatureResponse } from '../features/featureTypes'

export interface MemberDashboardResponse {
  tasks: TaskResponse[]
  issues: IssueResponse[]
  features: FeatureResponse[]
}

export interface SprintTaskStats {
  sprintId: number
  sprintName: string
  tasksByStatus: Record<string, number>
  totalTasks: number
}

export interface ServiceTicketStats {
  newCount: number
  openCount: number
}

export interface ManagerDashboardResponse {
  sprintTaskStats: SprintTaskStats | null
  serviceTicketStats: ServiceTicketStats | null
  isManager: boolean
}
