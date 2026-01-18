import { useEffect, useCallback } from 'react'
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

interface HtmlEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
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

export default function HtmlEditor({
  value,
  onChange,
  placeholder = 'Enter description...',
  minHeight = '200px',
}: HtmlEditorProps) {
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
          </div>
        </div>
      </LexicalComposer>
    </div>
  )
}
