import { useState } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'

interface TagsInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

export default function TagsInput({ value, onChange, placeholder, className = '' }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag])
    }
  }

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
        setInputValue('')
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const tags = pastedText
      .split(/[,\n\t]/)
      .map(tag => tag.trim())
      .filter(tag => tag && !value.includes(tag))
    
    if (tags.length > 0) {
      onChange([...value, ...tags])
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue)
      setInputValue('')
    }
  }

  return (
    <div className={`${className}`}>
      <div className="min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent flex flex-wrap gap-2 items-center">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-2 hover:text-blue-900 focus:outline-none"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Press Enter or comma to add a tag. Paste text to add multiple tags.
      </p>
    </div>
  )
}
