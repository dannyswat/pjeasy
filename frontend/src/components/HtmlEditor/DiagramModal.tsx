import { Excalidraw, exportToBlob, exportToSvg } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getDiagramIdFromUrl, getDiagramSource, uploadDiagram, type DiagramDocument } from './diagramApi'
import '@excalidraw/excalidraw/index.css'

interface DiagramModalProps {
  projectId: number
  diagramUrl?: string
  onClose: () => void
  onSaved: (imageUrl: string, saveAsNew: boolean) => void
}

export default function DiagramModal({
  projectId,
  diagramUrl,
  onClose,
  onSaved,
}: DiagramModalProps) {
  const [drawApi, setDrawApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [diagramId, setDiagramId] = useState<string | undefined>(() => getDiagramIdFromUrl(projectId, diagramUrl))
  const [diagramData, setDiagramData] = useState<DiagramDocument | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const nextDiagramId = getDiagramIdFromUrl(projectId, diagramUrl)
    setDiagramId(nextDiagramId)
  }, [diagramUrl, projectId])

  useEffect(() => {
    let cancelled = false

    if (!diagramId) {
      setDiagramData(null)
      setErrorMessage(null)
      return () => {
        cancelled = true
      }
    }

    setIsLoading(true)
    setErrorMessage(null)

    getDiagramSource(projectId, diagramId)
      .then((data) => {
        if (!cancelled) {
          setDiagramData(data)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setDiagramData(null)
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load diagram source')
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [diagramId, projectId])

  const handleClose = () => {
    if (drawApi) {
      drawApi.resetScene()
    }
    onClose()
  }

  const handleSave = async (saveAsNew: boolean) => {
    if (!drawApi) {
      return
    }

    const elements = drawApi.getSceneElements()
    if (elements.length === 0) {
      setErrorMessage('Add something to the diagram before saving.')
      return
    }

    try {
      const exportSettings = {
        elements,
        appState: drawApi.getAppState(),
        files: drawApi.getFiles(),
        exportPadding: 10,
        exportBackground: false,
      }
      const pngBlob = await exportToBlob(exportSettings)
      const svgElement = await exportToSvg(exportSettings)
      const nextDiagramID = saveAsNew ? crypto.randomUUID() : (diagramId ?? crypto.randomUUID())
      const result = await uploadDiagram(projectId, {
        id: nextDiagramID,
        diagram: JSON.stringify({
          elements,
          appState: drawApi.getAppState(),
          files: drawApi.getFiles(),
        }),
        svg: svgElement.outerHTML,
        png: await blobToDataURL(pngBlob),
      })

      setDiagramId(result.id)
      onSaved(result.diagramSvgUrl, saveAsNew)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save diagram')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex flex-col bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Diagram Editor</h2>
          <p className="text-sm text-gray-600">Create or update a project-scoped Excalidraw diagram.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSave(false)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!drawApi || isLoading}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => void handleSave(true)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!drawApi || isLoading}
          >
            Save New
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {errorMessage}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Loading diagram...
          </div>
        ) : (
          <Excalidraw
            initialData={{
              elements: diagramData?.elements,
              appState: diagramData?.appState
                ? { ...diagramData.appState, collaborators: new Map() }
                : undefined,
              files: diagramData?.files,
            }}
            excalidrawAPI={(api) => {
              setDrawApi(api)
            }}
          />
        )}
      </div>
    </div>,
    document.body
  )
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}