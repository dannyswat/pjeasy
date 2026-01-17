export interface CommentResponse {
  id: number
  itemId: number
  itemType: string
  content: string
  createdBy: number
  createdAt: string
  updatedAt: string
  creatorName: string
}

export interface CreateCommentRequest {
  content: string
}

export interface UpdateCommentRequest {
  content: string
}

export interface CommentsListResponse {
  comments: CommentResponse[]
  total: number
}
