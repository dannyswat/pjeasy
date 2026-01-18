import { useRef } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import './HtmlEditor.css'
import { createImageFileInput, uploadImage, ImageUploadError } from './imageUpload'

interface HtmlEditorProps {
  value: string,
  onChange: (value: string) => void,
  placeholder?: string,
  minHeight?: string,
}

export default function HtmlEditor({ 
  value, 
  onChange, 
  placeholder = 'Enter description...',
  minHeight = '200px'
}: HtmlEditorProps) {
  const quillRef = useRef<ReactQuill>(null)

  const imageHandler = () => {
    createImageFileInput(
      async (file) => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        const range = quill.getSelection(true)
        
        // Show uploading indicator
        quill.insertText(range.index, 'Uploading image...')
        quill.setSelection(range.index + 19, 0)

        try {
          const { url } = await uploadImage(file)
          
          // Remove uploading text and insert image
          quill.deleteText(range.index, 19)
          quill.insertEmbed(range.index, 'image', url)
          quill.setSelection(range.index + 1, 0)
        } catch (error) {
          // Remove uploading text on error
          quill.deleteText(range.index, 19)
          
          const message = error instanceof ImageUploadError 
            ? error.message 
            : 'Failed to upload image. Please try again.'
          alert(message)
          console.error('Image upload error:', error)
        }
      },
      (error) => {
        alert(error.message)
      }
    )
  }

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list',
    'color', 'background',
    'link', 'image'
  ]

  return (
    <div className="html-editor-wrapper" style={{ minHeight }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  )
}
