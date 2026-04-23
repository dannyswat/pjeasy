import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { getSecureApi, postSecureApi } from '../../apis/fetch'

export interface DiagramDocument {
  elements: NonDeletedExcalidrawElement[]
  appState: AppState
  files: BinaryFiles
}

export interface SaveDiagramPayload {
  id: string
  diagram: string
  svg: string
  png: string
}

export interface SaveDiagramResponse {
  id: string
  diagramSvgUrl: string
  diagramPngUrl: string
}

export function getDiagramIdFromUrl(projectId: number, imageUrl?: string): string | undefined {
  if (!imageUrl) {
    return undefined
  }

  const urlWithoutQuery = imageUrl.split('?')[0]
  const prefix = `/api/projects/${projectId}/diagrams/`
  if (!urlWithoutQuery.startsWith(prefix)) {
    return undefined
  }

  const fileName = urlWithoutQuery.slice(prefix.length)
  const extensionIndex = fileName.lastIndexOf('.')
  if (extensionIndex <= 0) {
    return undefined
  }

  return fileName.slice(0, extensionIndex)
}

export function getDiagramSource(projectId: number, diagramId: string) {
  return getSecureApi<DiagramDocument>(`/api/projects/${projectId}/diagrams/source/${diagramId}`)
}

export function uploadDiagram(projectId: number, payload: SaveDiagramPayload) {
  return postSecureApi<SaveDiagramResponse>(`/api/projects/${projectId}/diagrams`, payload)
}