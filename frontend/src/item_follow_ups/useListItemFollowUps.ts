import { useEffect, useState } from 'react'
import { getSecureApi } from '../apis/fetch'
import type { ItemFollowUpResponse, ItemFollowUpsListResponse } from './itemFollowUpTypes'

export function useListItemFollowUps(itemId: number, itemType: string) {
  const [followUps, setFollowUps] = useState<ItemFollowUpResponse[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFollowUps = async () => {
    if (!itemId || !itemType) {
      setFollowUps([])
      setTotal(0)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await getSecureApi<ItemFollowUpsListResponse>(`/api/item-follow-ups/${itemType}/${itemId}`)
      setFollowUps(data.followUps)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setFollowUps([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFollowUps()
  }, [itemId, itemType])

  return {
    followUps,
    total,
    isLoading,
    error,
    refetch: fetchFollowUps,
  }
}