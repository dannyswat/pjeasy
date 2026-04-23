import { useEffect, useCallback, useState, forwardRef, useImperativeHandle, useRef } from 'react'
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
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { $getRoot, $insertNodes, $nodesOfType, TextNode, type EditorState, type LexicalEditor } from 'lexical'
import DiagramModal from './DiagramModal'
import ToolbarPlugin from './plugins/ToolbarPlugin'
import TableActionMenuPlugin from './plugins/TableActionMenuPlugin'
import ImagePlugin from './plugins/ImagePlugin'
import PasteMarkdownPlugin from './plugins/PasteMarkdownPlugin'
import { $createImageNode, ImageNode } from './nodes/ImageNode'
import { ExtendedTextNode } from './nodes/ExtendedTextNode'
import { getDiagramIdFromUrl } from './diagramApi'
import './HtmlEditor.css'
import Prism from 'prismjs'
import loadLanguages from 'prismjs/components/index'

if (!(globalThis as { Prism?: typeof Prism }).Prism) {
  ;(globalThis as { Prism?: typeof Prism }).Prism = Prism
  loadLanguages(['markup', 'json', 'javascript', 'typescript', 'python', 'csharp', 'cpp'])
}

export interface HtmlEditorRef {
  resetContent: (html: string) => void
  insertImage: (src: string, altText?: string) => void
  replaceImageSrc: (oldSrc: string, newSrc: string) => void
}

interface HtmlEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  projectId?: number
}

function normalizeHtml(html: string): string {
  return html.trim().replace(/><\/p>/g, '></p>')
}

function resolveProjectID(explicitProjectID?: number): number | null {
  if (typeof explicitProjectID === 'number' && Number.isInteger(explicitProjectID) && explicitProjectID > 0) {
    return explicitProjectID
  }

  const match = globalThis.location?.pathname.match(/\/projects\/(\d+)(?:\/|$)/)
  if (!match) {
    return null
  }

  const parsed = Number.parseInt(match[1], 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function appendCacheBust(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${Date.now()}`
}

// Plugin to keep editor content in sync with external HTML value
function SyncHtmlContentPlugin({
  value,
  onResetRef,
}: {
  value: string
  onResetRef: (resetFn: (html: string) => void) => void
}) {
  const [editor] = useLexicalComposerContext()

  const applyHtml = useCallback(
    (html: string) => {
      editor.update(() => {
        const root = $getRoot()
        root.clear()

        if (!html.trim()) {
          return
        }

        const parser = new DOMParser()
        const dom = parser.parseFromString(html, 'text/html')
        const nodes = $generateNodesFromDOM(editor, dom)
        $insertNodes(nodes)
      })
    },
    [editor]
  )

  useEffect(() => {
    const currentHtml = editor.getEditorState().read(() => $generateHtmlFromNodes(editor, null))

    if (normalizeHtml(currentHtml) === normalizeHtml(value)) {
      return
    }

    applyHtml(value)
  }, [applyHtml, editor, value])

  useEffect(() => {
    onResetRef(applyHtml)
  }, [applyHtml, onResetRef])

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

function CodeHighlightingPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return registerCodeHighlighting(editor)
  }, [editor])

  return null
}

function EditorRefPlugin({ onEditorReady }: { onEditorReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    onEditorReady(editor)
  }, [editor, onEditorReady])

  return null
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
  quote: 'editor-quote',
  code: 'editor-code-block',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
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
  ({ value, onChange, placeholder = 'Enter description...', minHeight = '200px', projectId }, ref) => {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showPasteMarkdown, setShowPasteMarkdown] = useState(false)
    const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false)
    const [selectedDiagramURL, setSelectedDiagramURL] = useState<string | undefined>(undefined)
    const editorRef = useRef<LexicalEditor | null>(null)
    const activeProjectID = resolveProjectID(projectId)

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
        CodeNode,
        CodeHighlightNode,
        ExtendedTextNode,
        {
          replace: TextNode,
          with: (node: TextNode) => new ExtendedTextNode(node.__text),
          withKlass: ExtendedTextNode,
        },
        ImageNode,
      ],
    }

    // Ref to store reset function
    const resetContentRef = useRef<((html: string) => void) | null>(null)

    const handleEditorReady = useCallback((editor: LexicalEditor) => {
      editorRef.current = editor
    }, [])

    const insertImage = useCallback((src: string, altText = '') => {
      const editor = editorRef.current
      if (!editor) {
        return
      }

      editor.update(() => {
        const imageNode = $createImageNode({ src, altText })
        $insertNodes([imageNode])
      })
    }, [])

    const replaceImageSrc = useCallback((oldSrc: string, newSrc: string) => {
      const editor = editorRef.current
      if (!editor) {
        return
      }

      editor.update(() => {
        const oldBaseURL = oldSrc.split('?')[0]
        const imageNode = $nodesOfType(ImageNode).find((node) => node.getSrc().split('?')[0] === oldBaseURL)
        if (imageNode) {
          imageNode.setSrc(newSrc)
        }
      })
    }, [])

    const closeDiagramModal = useCallback(() => {
      setIsDiagramModalOpen(false)
      setSelectedDiagramURL(undefined)
    }, [])

    const openDiagramModal = useCallback((imageURL?: string) => {
      if (!activeProjectID) {
        return
      }

      const nextDiagramURL = getDiagramIdFromUrl(activeProjectID, imageURL) ? imageURL : undefined
      setSelectedDiagramURL(nextDiagramURL)
      setIsDiagramModalOpen(true)
    }, [activeProjectID])

    const handleDiagramSaved = useCallback((imageURL: string, saveAsNew: boolean) => {
      const nextImageURL = appendCacheBust(imageURL)

      if (selectedDiagramURL && !saveAsNew) {
        replaceImageSrc(selectedDiagramURL, nextImageURL)
      } else {
        insertImage(nextImageURL, 'Diagram')
      }

      closeDiagramModal()
    }, [closeDiagramModal, insertImage, replaceImageSrc, selectedDiagramURL])

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
      insertImage,
      replaceImageSrc,
    }))

    // Handle Escape to exit fullscreen
    useEffect(() => {
      if (!isFullscreen) return
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsFullscreen(false)
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isFullscreen])

    return (
      <div className={`html-editor-wrapper ${isFullscreen ? 'html-editor-fullscreen' : ''}`} style={isFullscreen ? undefined : { minHeight }}>
        <LexicalComposer initialConfig={initialConfig}>
          <div className="html-editor-container">
            <ToolbarPlugin
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen((f) => !f)}
              onOpenDiagram={activeProjectID ? openDiagramModal : undefined}
              onPasteMarkdown={() => setShowPasteMarkdown(true)}
            />
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
              <CodeHighlightingPlugin />
              <TableActionMenuPlugin />
              <ImagePlugin />
              <PasteMarkdownPlugin
                show={showPasteMarkdown}
                onClose={() => setShowPasteMarkdown(false)}
              />
              <SyncHtmlContentPlugin value={value} onResetRef={handleResetRef} />
              <HtmlChangePlugin onChange={onChange} />
              <EditorRefPlugin onEditorReady={handleEditorReady} />
            </div>
          </div>
        </LexicalComposer>
        {activeProjectID && isDiagramModalOpen && (
          <DiagramModal
            projectId={activeProjectID}
            diagramUrl={selectedDiagramURL}
            onClose={closeDiagramModal}
            onSaved={handleDiagramSaved}
          />
        )}
      </div>
    )
  }
)

HtmlEditor.displayName = 'HtmlEditor'

export default HtmlEditor
