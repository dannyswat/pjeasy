import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection'
import { mergeRegister } from '@lexical/utils'
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type NodeKey,
} from 'lexical'
import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { $isImageNode } from './ImageNode'

interface ImageComponentProps {
  src: string
  altText: string
  width?: number
  height?: number
  nodeKey: NodeKey
}

export default function ImageComponent({ src, altText, width, height, nodeKey }: ImageComponentProps): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey)
  const [draftSize, setDraftSize] = useState<{ width: number; height: number } | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const draftSizeRef = useRef<{ width: number; height: number } | null>(null)

  const displayWidth = draftSize?.width ?? width
  const displayHeight = draftSize?.height ?? height

  const setNodeDimensions = useCallback(
    (nextWidth: number, nextHeight: number) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if ($isImageNode(node)) {
          node.setWidthAndHeight(nextWidth, nextHeight)
        }
      })
    },
    [editor, nodeKey]
  )

  const removeImage = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node)) {
        node.remove()
      }
    })
  }, [editor, nodeKey])

  const handleClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node) || !wrapperRef.current?.contains(target)) {
        return false
      }

      if (!event.shiftKey) {
        clearSelection()
      }

      setSelected(true)
      return true
    },
    [clearSelection, setSelected]
  )

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        handleClick,
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        () => {
          const selection = $getSelection()
          if (isSelected && $isNodeSelection(selection)) {
            removeImage()
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        () => {
          const selection = $getSelection()
          if (isSelected && $isNodeSelection(selection)) {
            removeImage()
            return true
          }
          return false
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, handleClick, isSelected, removeImage])

  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const imageElement = imageRef.current
      if (!imageElement) {
        return
      }

      clearSelection()
      setSelected(true)

      const rect = imageElement.getBoundingClientRect()
      const startX = event.clientX
      const startWidth = Math.round(rect.width) || width || imageElement.naturalWidth || 240
      const startHeight = Math.round(rect.height) || height || imageElement.naturalHeight || 160
      const aspectRatio = startWidth / Math.max(startHeight, 1)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const nextWidth = Math.max(120, Math.round(startWidth + deltaX))
        const nextHeight = Math.max(80, Math.round(nextWidth / aspectRatio))
        const nextSize = { width: nextWidth, height: nextHeight }
        draftSizeRef.current = nextSize
        setDraftSize(nextSize)
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)

        const finalSize = draftSizeRef.current
        if (finalSize) {
          setNodeDimensions(finalSize.width, finalSize.height)
        }

        draftSizeRef.current = null
        setDraftSize(null)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [clearSelection, height, setNodeDimensions, setSelected, width]
  )

  return (
    <span
      ref={wrapperRef}
      className={`editor-image-shell${isSelected ? ' selected' : ''}`}
      contentEditable={false}
    >
      <img
        ref={imageRef}
        src={src}
        alt={altText}
        width={displayWidth}
        height={displayHeight}
        className={`editor-image${isSelected ? ' selected' : ''}`}
        style={{
          maxWidth: '100%',
          width: displayWidth ? `${displayWidth}px` : undefined,
          height: displayHeight ? `${displayHeight}px` : 'auto',
          borderRadius: '0.375rem',
        }}
        draggable={false}
      />
      {isSelected && (
        <button
          type="button"
          className="editor-image-resizer"
          onMouseDown={handleResizeStart}
          aria-label="Resize image"
        />
      )}
    </span>
  )
}