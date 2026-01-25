import { useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode, AutoLinkNode } from '@lexical/link'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, $insertNodes, type EditorState } from 'lexical'
import ToolbarPlugin from './plugins/ToolbarPlugin'
import TableActionMenuPlugin from './plugins/TableActionMenuPlugin'
import ImagePlugin from './plugins/ImagePlugin'
import { ImageNode } from './nodes/ImageNode'
import './HtmlEditor.css'

export interface HtmlEditorRef {
  resetContent: (html: string) => void
}

interface HtmlEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

// Plugin to expose imperative handle for resetting content
function ResetContentPlugin({ onResetRef }: { onResetRef: (resetFn: (html: string) => void) => void }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const resetContent = (html: string) => {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        
        if (html) {
          const parser = new DOMParser()
          const dom = parser.parseFromString(html, 'text/html')
          const nodes = $generateNodesFromDOM(editor, dom)
          $insertNodes(nodes)
        }
      })
    }

    onResetRef(resetContent)
  }, [editor, onResetRef])

  return null
}

// Plugin to load initial HTML content
function LoadInitialContentPlugin({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (value) {
      editor.update(() => {
        const root = $getRoot()
        // Only load if editor is empty
        if (root.getTextContent().trim() === '') {
          const parser = new DOMParser()
          const dom = parser.parseFromString(value, 'text/html')
          const nodes = $generateNodesFromDOM(editor, dom)
          root.clear()
          $insertNodes(nodes)
        }
      })
    }
  }, []) // Only run once on mount

  return null
}

// Plugin to sync HTML changes
function HtmlChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext()

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor, null)
        onChange(html)
      })
    },
    [editor, onChange]
  )

  return <OnChangePlugin onChange={handleChange} />
}

const theme = {
  paragraph: 'editor-paragraph',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
  },
  list: {
    ul: 'editor-list-ul',
    ol: 'editor-list-ol',
    listitem: 'editor-list-item',
    nested: {
      listitem: 'editor-nested-list',
    },
  },
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  table: 'editor-table',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
  tableRow: 'editor-table-row',
  image: 'editor-image',
}

function onError(error: Error) {
  console.error('Lexical error:', error)
}

const HtmlEditor = forwardRef<HtmlEditorRef, HtmlEditorProps>(
  ({ value, onChange, placeholder = 'Enter description...', minHeight = '200px' }, ref) => {
    const initialConfig = {
      namespace: 'HtmlEditor',
      theme,
      onError,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        ImageNode,
      ],
    }

    // Ref to store reset function
    const resetContentRef = useRef<(html: string) => void>(null)

    // Callback to set the reset function
    const handleResetRef = useCallback((fn: (html: string) => void) => {
      resetContentRef.current = fn
    }, [])

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      resetContent: (html: string) => {
        if (resetContentRef.current) {
          resetContentRef.current(html)
        }
      },
    }))

    return (
      <div className="html-editor-wrapper" style={{ minHeight }}>
        <LexicalComposer initialConfig={initialConfig}>
          <div className="html-editor-container">
            <ToolbarPlugin />
            <div className="editor-inner">
              <RichTextPlugin
                contentEditable={<ContentEditable className="editor-input" />}
                placeholder={<div className="editor-placeholder">{placeholder}</div>}
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <ListPlugin />
              <LinkPlugin />
              <TablePlugin />
              <TableActionMenuPlugin />
              <ImagePlugin />
              <LoadInitialContentPlugin value={value} />
              <HtmlChangePlugin onChange={onChange} />
              <ResetContentPlugin onResetRef={handleResetRef} />
            </div>
          </div>
        </LexicalComposer>
      </div>
    )
  }
)

HtmlEditor.displayName = 'HtmlEditor'

export default HtmlEditor
