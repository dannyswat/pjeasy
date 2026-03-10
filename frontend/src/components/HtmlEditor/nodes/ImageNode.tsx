import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'
import type { JSX } from 'react'
import ImageComponent from './ImageComponent'

export interface ImagePayload {
  src: string
  altText?: string
  width?: number
  height?: number
  key?: NodeKey
}

export type SerializedImageNode = Spread<
  {
    src: string
    altText: string
    width?: number
    height?: number
  },
  SerializedLexicalNode
>

function sanitizeDimension(value?: number | null): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return undefined
  }

  return value
}

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    if (domNode.dataset.lexicalLinebreak === 'true') {
      return null
    }

    const rawSrc = domNode.getAttribute('src')?.trim()

    if (!rawSrc) {
      return null
    }

    const altText = domNode.getAttribute('alt') ?? ''
    const width = sanitizeDimension(domNode.width)
    const height = sanitizeDimension(domNode.height)
    const node = $createImageNode({ src: rawSrc, altText, width, height })
    return { node }
  }
  return null
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string
  __width: number | undefined
  __height: number | undefined

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, altText, width, height } = serializedNode
    return $createImageNode({ src, altText, width, height })
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    }
  }

  constructor(
    src: string,
    altText: string = '',
    width?: number,
    height?: number,
    key?: NodeKey
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__width = sanitizeDimension(width)
    this.__height = sanitizeDimension(height)
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
    }
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img')
    img.setAttribute('src', this.__src)
    img.setAttribute('alt', this.__altText)
    if (this.__width) {
      img.setAttribute('width', String(this.__width))
    }
    if (this.__height) {
      img.setAttribute('height', String(this.__height))
    }
    img.style.maxWidth = '100%'
    return { element: img }
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'editor-image-wrapper'
    return span
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  setWidthAndHeight(width?: number, height?: number): void {
    const writable = this.getWritable()
    writable.__width = sanitizeDimension(width)
    writable.__height = sanitizeDimension(height)
  }

  decorate(): JSX.Element {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        nodeKey={this.__key}
      />
    )
  }
}

export function $createImageNode({
  src,
  altText = '',
  width,
  height,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(src, altText, width, height, key)
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode
}
