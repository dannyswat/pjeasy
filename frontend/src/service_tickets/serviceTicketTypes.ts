export interface ServiceTicketResponse {
  id: number
  refNum: string
  projectId: number
  title: string
  description: string
  status: string // 'Open' | 'Fulfilled' | 'Closed'
  priority: string // 'Immediate' | 'Urgent' | 'High' | 'Normal' | 'Low'
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateServiceTicketRequest {
  title: string
  description: string
  priority?: string
}

export interface UpdateServiceTicketRequest {
  title: string
  description: string
  priority?: string
}

export interface UpdateServiceTicketStatusRequest {
  status: string
}

export interface ServiceTicketsListResponse {
  serviceTickets: ServiceTicketResponse[]
  total: number
  page: number
  pageSize: number
}

export const ServiceTicketStatus = {
  OPEN: 'Open',
  FULFILLED: 'Fulfilled',
  CLOSED: 'Closed',
} as const

export type ServiceTicketStatusType = typeof ServiceTicketStatus[keyof typeof ServiceTicketStatus]

export const ServiceTicketPriority = {
  IMMEDIATE: 'Immediate',
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',
} as const

export type ServiceTicketPriorityType = typeof ServiceTicketPriority[keyof typeof ServiceTicketPriority]

export const ServiceTicketStatusDisplay: Record<string, string> = {
  [ServiceTicketStatus.OPEN]: 'Open',
  [ServiceTicketStatus.FULFILLED]: 'Fulfilled',
  [ServiceTicketStatus.CLOSED]: 'Closed',
}

export const ServiceTicketPriorityDisplay: Record<string, string> = {
  [ServiceTicketPriority.IMMEDIATE]: 'Immediate',
  [ServiceTicketPriority.URGENT]: 'Urgent',
  [ServiceTicketPriority.HIGH]: 'High',
  [ServiceTicketPriority.NORMAL]: 'Normal',
  [ServiceTicketPriority.LOW]: 'Low',
}
