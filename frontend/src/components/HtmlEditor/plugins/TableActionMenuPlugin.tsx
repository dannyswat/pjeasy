import { useCallback, useEffect, useRef, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
} from 'lexical'
import {
  $isTableCellNode,
  $isTableRowNode,
  $isTableNode,
  TableCellNode,
  TableNode,
  TableRowNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumn__EXPERIMENTAL,
  $insertTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  TableCellHeaderStates,
} from '@lexical/table'
import { $findMatchingParent } from '@lexical/utils'
import { createPortal } from 'react-dom'

interface MenuPosition {
  x: number
  y: number
}

function TableActionMenu({
  cellNode,
  onClose,
  position,
}: {
  cellNode: TableCellNode
  onClose: () => void
  position: MenuPosition
}) {
  const [editor] = useLexicalComposerContext()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const insertRowAbove = () => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(false)
    })
    onClose()
  }

  const insertRowBelow = () => {
    editor.update(() => {
      $insertTableRow__EXPERIMENTAL(true)
    })
    onClose()
  }

  const insertColumnBefore = () => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(false)
    })
    onClose()
  }

  const insertColumnAfter = () => {
    editor.update(() => {
      $insertTableColumn__EXPERIMENTAL(true)
    })
    onClose()
  }

  const deleteRow = () => {
    editor.update(() => {
      $deleteTableRow__EXPERIMENTAL()
    })
    onClose()
  }

  const deleteColumn = () => {
    editor.update(() => {
      $deleteTableColumn__EXPERIMENTAL()
    })
    onClose()
  }

  const deleteTable = () => {
    editor.update(() => {
      const tableNode = $findMatchingParent(cellNode, $isTableNode)
      if (tableNode) {
        tableNode.remove()
      }
    })
    onClose()
  }

  const toggleHeaderRow = () => {
    editor.update(() => {
      const tableNode = $findMatchingParent(cellNode, $isTableNode) as TableNode | null
      if (tableNode) {
        const rowIndex = $getTableRowIndexFromTableCellNode(cellNode)
        const rows = tableNode.getChildren()
        const row = rows[rowIndex] as TableRowNode | undefined
        if (row && $isTableRowNode(row)) {
          const cells = row.getChildren()
          cells.forEach((cell) => {
            if ($isTableCellNode(cell)) {
              const currentType = cell.getHeaderStyles()
              if (currentType === TableCellHeaderStates.ROW) {
                cell.setHeaderStyles(TableCellHeaderStates.NO_STATUS)
              } else {
                cell.setHeaderStyles(TableCellHeaderStates.ROW)
              }
            }
          })
        }
      }
    })
    onClose()
  }

  return createPortal(
    <div
      ref={menuRef}
      className="table-action-menu"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
    >
      <button type="button" onClick={insertRowAbove}>
        Insert row above
      </button>
      <button type="button" onClick={insertRowBelow}>
        Insert row below
      </button>
      <button type="button" onClick={insertColumnBefore}>
        Insert column before
      </button>
      <button type="button" onClick={insertColumnAfter}>
        Insert column after
      </button>
      <hr />
      <button type="button" onClick={toggleHeaderRow}>
        Toggle header row
      </button>
      <hr />
      <button type="button" onClick={deleteRow}>
        Delete row
      </button>
      <button type="button" onClick={deleteColumn}>
        Delete column
      </button>
      <button type="button" onClick={deleteTable} className="danger">
        Delete table
      </button>
    </div>,
    document.body
  )
}

export default function TableActionMenuPlugin() {
  const [editor] = useLexicalComposerContext()
  const [tableCellNode, setTableCellNode] = useState<TableCellNode | null>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)

  const closeMenu = useCallback(() => {
    setTableCellNode(null)
    setMenuPosition(null)
  }, [])

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          return
        }

        const anchorNode = selection.anchor.getNode()
        const cellNode = $findMatchingParent(anchorNode, $isTableCellNode)
        
        if (cellNode && $isTableCellNode(cellNode)) {
          event.preventDefault()
          setTableCellNode(cellNode)
          setMenuPosition({ x: event.clientX, y: event.clientY })
        }
      })
    }

    const rootElement = editor.getRootElement()
    if (rootElement) {
      rootElement.addEventListener('contextmenu', handleContextMenu)
      return () => {
        rootElement.removeEventListener('contextmenu', handleContextMenu)
      }
    }
  }, [editor])

  if (!tableCellNode || !menuPosition) {
    return null
  }

  return (
    <TableActionMenu
      cellNode={tableCellNode}
      onClose={closeMenu}
      position={menuPosition}
    />
  )
}
