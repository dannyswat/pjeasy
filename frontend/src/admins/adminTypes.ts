import type { UserResponse } from '../auth/userResponse'

export interface AdminResponse {
  id: number
  userId: number
  user: UserResponse
  createdAt: string
  expiredAfter?: string
  isActive: boolean
}

export interface AssignAdminRequest {
  loginId: string
  expiredAfter?: string
}
