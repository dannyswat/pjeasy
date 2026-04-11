import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

export interface RemoteDropdownPage<T> {
  items: T[]
  total: number
}

interface RemoteDropdownProps<T> {
  label: string
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  value?: string | number
  selectedOption?: T | null
  onChange: (option: T | null) => void
  queryKey: readonly unknown[]
  loadPage: (params: { search: string; page: number; pageSize: number }) => Promise<RemoteDropdownPage<T>>
  getOptionValue: (option: T) => string | number
  getOptionLabel: (option: T) => string
  getOptionDescription?: (option: T) => string | undefined
  pageSize?: number
  disabled?: boolean
}

export default function RemoteDropdown<T>({
  label,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  emptyLabel = 'No options found',
  value,
  selectedOption,
  onChange,
  queryKey,
  loadPage,
  getOptionValue,
  getOptionLabel,
  getOptionDescription,
  pageSize = 20,
  disabled = false,
}: RemoteDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const query = useInfiniteQuery({
    queryKey: [...queryKey, search, pageSize],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => loadPage({ search, page: pageParam, pageSize }),
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((count, page) => count + page.items.length, 0)
      return loadedCount < lastPage.total ? allPages.length + 1 : undefined
    },
    enabled: isOpen && !disabled,
  })

  const options = useMemo(() => {
    const loaded = query.data?.pages.flatMap((page) => page.items) ?? []
    if (!selectedOption) {
      return loaded
    }

    const selectedValue = getOptionValue(selectedOption)
    return loaded.some((option) => getOptionValue(option) === selectedValue)
      ? loaded
      : [selectedOption, ...loaded]
  }, [getOptionValue, query.data?.pages, selectedOption])

  const selected = useMemo(() => {
    if (selectedOption) {
      return selectedOption
    }

    return options.find((option) => getOptionValue(option) === value) ?? null
  }, [getOptionValue, options, selectedOption, value])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !listRef.current || !sentinelRef.current || !query.hasNextPage || query.isFetchingNextPage) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          query.fetchNextPage()
        }
      },
      { root: listRef.current, rootMargin: '80px' },
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [isOpen, query.fetchNextPage, query.hasNextPage, query.isFetchingNextPage])

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen((open) => !open)
          }
        }}
        disabled={disabled}
        className="w-full min-h-10 px-4 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? getOptionLabel(selected) : placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
            >
              Clear selection
            </button>

            {options.map((option) => {
              const optionValue = getOptionValue(option)
              const description = getOptionDescription?.(option)
              const isSelected = value === optionValue

              return (
                <button
                  key={String(optionValue)}
                  type="button"
                  onClick={() => {
                    onChange(option)
                    setIsOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}
                >
                  <div className="text-sm text-gray-900">{getOptionLabel(option)}</div>
                  {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
                </button>
              )
            })}

            {!query.isLoading && options.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500">{emptyLabel}</div>
            )}

            {(query.isLoading || query.isFetchingNextPage) && (
              <div className="px-3 py-4 text-sm text-gray-500">Loading...</div>
            )}

            <div ref={sentinelRef} className="h-2" />
          </div>
        </div>
      )}
    </div>
  )
}
