import type { UserResponse } from '../auth/userResponse'

export interface ProjectResponse {
  id: number
  name: string
  description: string
  isArchived: boolean
  createdBy: number
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface MemberResponse {
  id: number
  projectId: number
  userId: number
  user: UserResponse
  isAdmin: boolean
  isUser: boolean
  addedAt: string
}

export interface ProjectWithMembersResponse {
  project: ProjectResponse
  members: MemberResponse[]
}

export interface CreateProjectRequest {
  name: string
  description: string
}

export interface UpdateProjectRequest {
  name: string
  description: string
}

export interface AddMemberRequest {
  loginId: string
  isAdmin: boolean
  isUser: boolean
}

export interface CreateProjectInvitationRequest {
  role: 'member' | 'user'
  expiresAt?: string
}

export interface ProjectInvitationResponse {
  id: number
  token?: string
  projectId: number
  projectName: string
  role: 'member' | 'user'
  expiresAt?: string
  createdAt?: string
  revokedAt?: string
}

export interface ProjectInvitationListResponse {
  invitations: ProjectInvitationResponse[]
}

export interface AcceptProjectInvitationResponse {
  message: string
  projectId: number
}

export interface ProjectsListResponse {
  projects: ProjectResponse[]
  total: number
  page: number
  pageSize: number
}
