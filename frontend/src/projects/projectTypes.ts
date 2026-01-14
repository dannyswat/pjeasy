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
}

export interface ProjectsListResponse {
  projects: ProjectResponse[]
  total: number
  page: number
  pageSize: number
}
