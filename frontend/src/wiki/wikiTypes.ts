export interface WikiPageResponse {
  id: number
  projectId: number
  slug: string
  title: string
  content: string
  contentHash?: string
  version: number
  status: string
  parentId?: number
  sortOrder: number
  createdBy: number
  updatedBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateWikiPageRequest {
  title: string
  content?: string
  parentId?: number
  sortOrder?: number
}

export interface UpdateWikiPageRequest {
  title: string
  parentId?: number
  sortOrder?: number
}

export interface UpdateWikiPageContentRequest {
  content: string
}

export interface UpdateWikiPageStatusRequest {
  status: string
}

export interface WikiPageListResponse {
  wikiPages: WikiPageResponse[]
  total: number
  page: number
  pageSize: number
}

export interface WikiPageTreeResponse {
  wikiPages: WikiPageResponse[]
}

export interface WikiPageChangeResponse {
  id: number
  wikiPageId: number
  projectId: number
  itemType: string
  itemId: number
  baseHash: string
  delta?: string
  snapshot: string
  snapshotHash: string
  changeType: string
  status: string
  mergedAt?: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateWikiPageChangeRequest {
  itemType: string
  itemId: number
  content: string
}

export interface ResolveConflictRequest {
  content: string
}

export interface MergeChangesRequest {
  itemType: string
  itemId: number
}

export interface WikiPageChangesListResponse {
  changes: WikiPageChangeResponse[]
  total: number
  page: number
  pageSize: number
}

export interface PreviewMergeResponse {
  content: string
}

export const WikiPageStatus = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
} as const

export const WikiPageStatusDisplay: Record<string, string> = {
  Draft: 'Draft',
  Published: 'Published',
  Archived: 'Archived',
}

export const WikiPageChangeStatus = {
  PENDING: 'Pending',
  MERGED: 'Merged',
  REJECTED: 'Rejected',
  CONFLICT: 'Conflict',
} as const

export const WikiPageChangeStatusDisplay: Record<string, string> = {
  Pending: 'Pending',
  Merged: 'Merged',
  Rejected: 'Rejected',
  Conflict: 'Conflict',
}

export const WikiPageItemType = {
  FEATURE: 'feature',
  ISSUE: 'issue',
} as const

export type WikiPageStatusType = typeof WikiPageStatus[keyof typeof WikiPageStatus]
export type WikiPageChangeStatusType = typeof WikiPageChangeStatus[keyof typeof WikiPageChangeStatus]
export type WikiPageItemTypeType = typeof WikiPageItemType[keyof typeof WikiPageItemType]

// Helper type for tree structure
export interface WikiPageTreeNode extends WikiPageResponse {
  children: WikiPageTreeNode[]
}

// Build tree structure from flat list
export function buildWikiPageTree(pages: WikiPageResponse[]): WikiPageTreeNode[] {
  const pageMap = new Map<number, WikiPageTreeNode>()
  const rootPages: WikiPageTreeNode[] = []

  // First pass: create nodes
  pages.forEach(page => {
    pageMap.set(page.id, { ...page, children: [] })
  })

  // Second pass: build tree
  pages.forEach(page => {
    const node = pageMap.get(page.id)!
    if (page.parentId && pageMap.has(page.parentId)) {
      pageMap.get(page.parentId)!.children.push(node)
    } else {
      rootPages.push(node)
    }
  })

  // Sort children by sortOrder
  const sortNodes = (nodes: WikiPageTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder)
    nodes.forEach(node => sortNodes(node.children))
  }
  sortNodes(rootPages)

  return rootPages
}
