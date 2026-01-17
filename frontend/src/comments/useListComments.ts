import { useState, useEffect } from 'react'
import type { CommentResponse, CommentsListResponse } from './commentTypes'
import { getSecureApi } from '../apis/fetch'

export function useListComments(itemId: number, itemType: string) {
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = async () => {
    if (!itemId || !itemType) {
      setComments([])
      setTotal(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await getSecureApi<CommentsListResponse>(`/api/comments/${itemType}/${itemId}`)

      setComments(data.comments)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setComments([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [itemId, itemType])

  return {
    comments,
    total,
    isLoading,
    error,
    refetch: fetchComments
  }
}
