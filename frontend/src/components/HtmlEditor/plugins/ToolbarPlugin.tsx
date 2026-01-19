import { useCallback, useEffect, useState, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $createParagraphNode,
} from 'lexical'
import {
  $setBlocksType,
} from '@lexical/selection'
import {
  $createHeadingNode,
  $isHeadingNode,
  type HeadingTagType,
} from '@lexical/rich-text'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $findMatchingParent, mergeRegister } from '@lexical/utils'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import { $createImageNode } from '../nodes/ImageNode'
import { $insertNodes } from 'lexical'
import { uploadImage, validateImageFile, ImageUploadError } from '../imageUpload'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp']

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [blockType, setBlockType] = useState<string>('paragraph')
  const [showTablePicker, setShowTablePicker] = useState(false)
  const [hoveredRows, setHoveredRows] = useState(0)
  const [hoveredCols, setHoveredCols] = useState(0)
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 })
  const tableButtonRef = useRef<HTMLButtonElement>(null)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))

      const anchorNode = selection.anchor.getNode()
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent()
              return parent !== null && parent.getKey() === 'root'
            })

      if (element !== null) {
        if ($isListNode(element)) {
          const parentList = $findMatchingParent(anchorNode, $isListNode)
          setBlockType(parentList ? (parentList as ListNode).getListType() : element.getType())
        } else if ($isHeadingNode(element)) {
          setBlockType(element.getTag())
        } else {
          setBlockType(element.getType())
        }
      }

      // Check for link
      const node = anchorNode.getParent()
      setIsLink($isLinkNode(node))
    }
  }, [])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        COMMAND_PRIORITY_CRITICAL
      )
    )
  }, [editor, updateToolbar])

  // Close table picker on outside click
  useEffect(() => {
    if (!showTablePicker) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        tableButtonRef.current &&
        !tableButtonRef.current.contains(target) &&
        !(target as HTMLElement).closest('.table-picker-popup')
      ) {
        setShowTablePicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTablePicker])

  const formatHeading = (headingSize: HeadingTagType | 'paragraph') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (headingSize === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode())
        } else {
          $setBlocksType(selection, () => $createHeadingNode(headingSize))
        }
      }
    })
  }

  const insertLink = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    } else {
      const url = prompt('Enter URL:', 'https://')
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
      }
    }
  }

  const insertImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ALLOWED_IMAGE_TYPES.join(',')
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        validateImageFile(file)
        const { url } = await uploadImage(file)
        editor.update(() => {
          const imageNode = $createImageNode({ src: url, altText: file.name })
          $insertNodes([imageNode])
        })
      } catch (error) {
        const message = error instanceof ImageUploadError
          ? error.message
          : 'Failed to upload image'
        alert(message)
      }
    }
    input.click()
  }

  const insertTable = (rows: number, cols: number) => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: String(cols),
      rows: String(rows),
    })
    setShowTablePicker(false)
  }

  return (
    <div className="toolbar">
      {/* Heading dropdown */}
      <select
        className="toolbar-select"
        value={blockType}
        onChange={(e) => formatHeading(e.target.value as HeadingTagType | 'paragraph')}
      >
        <option value="paragraph">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <span className="toolbar-divider" />

      {/* Text formatting */}
      <button
        type="button"
        className={`toolbar-button ${isBold ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className={`toolbar-button ${isItalic ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        className={`toolbar-button ${isUnderline ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Underline"
      >
        <u>U</u>
      </button>
      <button
        type="button"
        className={`toolbar-button ${isStrikethrough ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        title="Strikethrough"
      >
        <s>S</s>
      </button>

      <span className="toolbar-divider" />

      {/* Lists */}
      <button
        type="button"
        className={`toolbar-button ${blockType === 'bullet' ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        title="Bullet List"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3" cy="4" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="3" cy="12" r="1.5" />
          <rect x="6" y="3" width="9" height="2" />
          <rect x="6" y="7" width="9" height="2" />
          <rect x="6" y="11" width="9" height="2" />
        </svg>
      </button>
      <button
        type="button"
        className={`toolbar-button ${blockType === 'number' ? 'active' : ''}`}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        title="Numbered List"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <text x="1" y="5" fontSize="5" fontWeight="bold">1</text>
          <text x="1" y="9" fontSize="5" fontWeight="bold">2</text>
          <text x="1" y="13" fontSize="5" fontWeight="bold">3</text>
          <rect x="6" y="3" width="9" height="2" />
          <rect x="6" y="7" width="9" height="2" />
          <rect x="6" y="11" width="9" height="2" />
        </svg>
      </button>

      <span className="toolbar-divider" />

      {/* Link */}
      <button
        type="button"
        className={`toolbar-button ${isLink ? 'active' : ''}`}
        onClick={insertLink}
        title="Insert Link"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.354 5.5H7a.5.5 0 0 1 0 1h-.354a4 4 0 0 0 0 8h.354a.5.5 0 0 1 0 1H6.5a5 5 0 0 1 0-10zm3.292 0H9a.5.5 0 0 1 0 1h.646a4 4 0 0 0 0 8H9a.5.5 0 0 1 0 1h.5a5 5 0 0 0 0-10z" transform="scale(0.8) translate(2, 2)" />
          <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" transform="scale(0.8) translate(2, 2)" />
        </svg>
      </button>

      {/* Image */}
      <button
        type="button"
        className="toolbar-button"
        onClick={insertImage}
        title="Insert Image"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
          <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z" />
        </svg>
      </button>

      <span className="toolbar-divider" />

      {/* Table */}
      <button
        ref={tableButtonRef}
        type="button"
        className="toolbar-button"
        onClick={() => {
          if (!showTablePicker && tableButtonRef.current) {
            const rect = tableButtonRef.current.getBoundingClientRect()
            const toolbar = tableButtonRef.current.closest('.toolbar')
            const toolbarRect = toolbar?.getBoundingClientRect()
            setPickerPosition({
              top: tableButtonRef.current.offsetTop + tableButtonRef.current.offsetHeight + 4,
              left: toolbarRect ? rect.left - toolbarRect.left : tableButtonRef.current.offsetLeft,
            })
          }
          setShowTablePicker(!showTablePicker)
        }}
        title="Insert Table"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
          <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {/* Table Picker Popup */}
      {showTablePicker && (
        <div
          className="table-picker-popup"
          style={{
            position: 'absolute',
            top: `${pickerPosition.top}px`,
            left: `${pickerPosition.left - 40}px`,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
            {hoveredRows > 0 && hoveredCols > 0
              ? `${hoveredRows} x ${hoveredCols}`
              : 'Select table size'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 20px)',
              gap: '2px',
            }}
          >
            {Array.from({ length: 100 }, (_, i) => {
              const row = Math.floor(i / 10) + 1
              const col = (i % 10) + 1
              const isHighlighted = row <= hoveredRows && col <= hoveredCols
              return (
                <div
                  key={i}
                  onMouseEnter={() => {
                    setHoveredRows(row)
                    setHoveredCols(col)
                  }}
                  onClick={() => insertTable(row, col)}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '1px solid #ddd',
                    backgroundColor: isHighlighted ? '#4a9eff' : 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
