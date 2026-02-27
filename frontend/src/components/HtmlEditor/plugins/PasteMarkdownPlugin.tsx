import { useState, useRef, useEffect, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $generateNodesFromDOM } from '@lexical/html'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  type LexicalNode,
} from 'lexical'
import { marked } from 'marked'

/**
 * Sanitize HTML converted from markdown:
 * - Remove all external images (only allow relative/same-origin src)
 * - Add rel="noopener noreferrer" and target="_blank" to external links
 */
function sanitizeHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Block external images — remove <img> tags with absolute URLs
  const images = doc.querySelectorAll('img')
  images.forEach((img) => {
    const src = img.getAttribute('src') || ''
    const isExternal =
      /^https?:\/\//i.test(src) || src.startsWith('//')
    if (isExternal) {
      const placeholder = doc.createTextNode(`[image removed: ${src}]`)
      img.parentNode?.replaceChild(placeholder, img)
    }
  })

  // Handle external links — add safety attributes
  const links = doc.querySelectorAll('a')
  links.forEach((a) => {
    const href = a.getAttribute('href') || ''
    const isExternal =
      /^https?:\/\//i.test(href) || href.startsWith('//')
    if (isExternal) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    }
  })

  return doc.body.innerHTML
}

/** Configure marked for safe output */
function convertMarkdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string

  return sanitizeHtml(rawHtml)
}

function createFallbackNodesFromMarkdown(markdown: string): LexicalNode[] {
  const blocks = markdown
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)

  return blocks.map((block) => {
    const paragraph = $createParagraphNode()
    paragraph.append($createTextNode(block))
    return paragraph
  })
}

function normalizeTopLevelNodes(nodes: LexicalNode[]): LexicalNode[] {
  const normalized: LexicalNode[] = []

  nodes.forEach((node) => {
    if ($isElementNode(node) || $isDecoratorNode(node)) {
      normalized.push(node)
      return
    }

    const paragraph = $createParagraphNode()
    paragraph.append(node)
    normalized.push(paragraph)
  })

  return normalized
}

interface PasteMarkdownPluginProps {
  show: boolean
  onClose: () => void
}

export default function PasteMarkdownPlugin({ show, onClose }: PasteMarkdownPluginProps) {
  const [editor] = useLexicalComposerContext()
  const [markdown, setMarkdown] = useState('')
  const [preview, setPreview] = useState('')
  const [insertError, setInsertError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Focus textarea when dialog opens
  useEffect(() => {
    if (show) {
      setMarkdown('')
      setPreview('')
      setInsertError('')
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [show])

  // Live preview
  useEffect(() => {
    if (!markdown.trim()) {
      setPreview('')
      return
    }
    try {
      setPreview(convertMarkdownToHtml(markdown))
    } catch {
      setPreview('<p style="color:red">Error parsing markdown</p>')
    }
  }, [markdown])

  // Close on Escape
  useEffect(() => {
    if (!show) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [show, onClose])

  const handleInsert = useCallback(() => {
    if (!markdown.trim()) return

    setInsertError('')
    let didInsert = false

    try {
      const html = convertMarkdownToHtml(markdown)

      editor.update(() => {
        let nodes: LexicalNode[] = []

        try {
          const parser = new DOMParser()
          const dom = parser.parseFromString(html, 'text/html')
          nodes = $generateNodesFromDOM(editor, dom).filter((node) => {
            return !(node.getType() === 'paragraph' && node.getTextContent().trim() === '')
          })
        } catch (error) {
          console.error('Failed to generate nodes from markdown HTML:', error)
        }

        if (nodes.length === 0) {
          nodes = createFallbackNodesFromMarkdown(markdown)
        }

        nodes = normalizeTopLevelNodes(nodes)

        if (nodes.length === 0) return

        const root = $getRoot()
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          try {
            const anchorTopLevel = selection.anchor.getNode().getTopLevelElementOrThrow()
            let insertAfterNode: LexicalNode = anchorTopLevel

            nodes.forEach((node) => {
              insertAfterNode.insertAfter(node)
              insertAfterNode = node
            })

            const nextLine = $createParagraphNode()
            insertAfterNode.insertAfter(nextLine)
            nextLine.selectStart()
            didInsert = true
            return
          } catch (error) {
            console.error('Failed to insert markdown at selection, appending to end:', error)
          }
        }

        nodes.forEach((node) => root.append(node))
        const nextLine = $createParagraphNode()
        root.append(nextLine)
        nextLine.selectStart()
        didInsert = true
      })
    } catch (error) {
      console.error('Failed to parse markdown:', error)
    }

    if (!didInsert) {
      setInsertError('Unable to insert this markdown content. Please try a smaller chunk.')
      return
    }

    setMarkdown('')
    setPreview('')
    onClose()
  }, [editor, markdown, onClose])

  if (!show) return null

  return (
    <div
      ref={overlayRef}
      className="paste-markdown-overlay"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="paste-markdown-dialog">
        <div className="paste-markdown-header">
          <h3>Paste Markdown</h3>
          <button
            type="button"
            className="paste-markdown-close"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="paste-markdown-body">
          <div className="paste-markdown-input-section">
            <label className="paste-markdown-label">Markdown</label>
            <textarea
              ref={textareaRef}
              className="paste-markdown-textarea"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={"Paste your markdown here...\n\n# Heading\n**Bold** and *italic*\n- List item\n[Link](https://...)"}
              spellCheck={false}
            />
          </div>

          {preview && (
            <div className="paste-markdown-preview-section">
              <label className="paste-markdown-label">Preview</label>
              <div
                className="paste-markdown-preview"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          )}
        </div>

        <div className="paste-markdown-footer">
          <span className="paste-markdown-hint">
            {insertError || 'External images will be removed. External links open in new tab.'}
          </span>
          <div className="paste-markdown-actions">
            <button
              type="button"
              className="paste-markdown-btn paste-markdown-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="paste-markdown-btn paste-markdown-btn-insert"
              onClick={handleInsert}
              disabled={!markdown.trim()}
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
