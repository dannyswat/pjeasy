export interface UserDailyTimeLogResponse {
  id: number
  userId: number
  projectId: number
  userDailyItemId: number
  date: string
  startUnit: number
  durationUnits: number
  createdAt: string
  updatedAt: string
}

export interface UserDailyItemResponse {
  id: number
  userId: number
  projectId: number
  projectName: string
  date: string
  itemType: 'task' | 'issue' | 'feature'
  itemId: number
  title: string
  status: string
  refNum?: string
  timeLogs: UserDailyTimeLogResponse[]
  totalUnits: number
  totalHours: number
  statusOptions: string[]
  createdAt: string
  updatedAt: string
}

export interface UserDailyCandidateResponse {
  projectId: number
  projectName: string
  itemType: 'task' | 'issue' | 'feature'
  itemId: number
  title: string
  status: string
  refNum?: string
  alreadyAdded: boolean
  statusOptions: string[]
}

export interface UserDailyBoardResponse {
  date: string
  items: UserDailyItemResponse[]
  candidateItems: UserDailyCandidateResponse[]
  timeLogs: UserDailyTimeLogResponse[]
  totalUnits: number
  totalHours: number
}

export interface UserDailyProjectSummaryResponse {
  projectId: number
  projectName: string
  totalUnits: number
  totalHours: number
}

export interface UserDailyDaySummaryResponse {
  date: string
  totalUnits: number
  totalHours: number
}

export interface UserDailySummaryResponse {
  range: 'day' | 'week' | 'month'
  startDate: string
  endDate: string
  totalUnits: number
  totalHours: number
  projects: UserDailyProjectSummaryResponse[]
  days: UserDailyDaySummaryResponse[]
}

export interface AddUserDailyItemRequest {
  date: string
  itemType: 'task' | 'issue' | 'feature'
  itemId: number
}

export interface UpdateUserDailyItemStatusRequest {
  status: string
}

export interface CreateUserDailyTimeLogRequest {
  userDailyItemId: number
  durationUnits: number
}

export interface UpdateUserDailyTimeLogRequest {
  durationUnits: number
}