import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSecureApi, getSecureApi, patchSecureApi, postSecureApi } from '../apis/fetch'
import type {
  AddUserDailyItemRequest,
  CreateUserDailyTimeLogRequest,
  UpdateUserDailyItemStatusRequest,
  UpdateUserDailyTimeLogRequest,
  UserDailyBoardResponse,
  UserDailyItemResponse,
  UserDailySummaryResponse,
  UserDailyTimeLogResponse,
} from './userDailyTypes'

export function useUserDailyBoard(date: string) {
  return useQuery({
    queryKey: ['userDaily', date],
    queryFn: async () => getSecureApi<UserDailyBoardResponse>(`/api/user-daily?date=${encodeURIComponent(date)}`),
    enabled: !!date,
  })
}

export function useUserDailySummary(date: string, range: 'day' | 'week' | 'month') {
  return useQuery({
    queryKey: ['userDailySummary', date, range],
    queryFn: async () => getSecureApi<UserDailySummaryResponse>(`/api/user-daily/summary?date=${encodeURIComponent(date)}&range=${encodeURIComponent(range)}`),
    enabled: !!date,
  })
}

export function useAddUserDailyItem(date: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: AddUserDailyItemRequest) => postSecureApi<UserDailyItemResponse>('/api/user-daily/items', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDaily', date] })
      queryClient.invalidateQueries({ queryKey: ['userDailySummary'] })
    },
  })
}

export function useRemoveUserDailyItem(date: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dailyItemId: number) => deleteSecureApi<void>(`/api/user-daily/items/${dailyItemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDaily', date] })
      queryClient.invalidateQueries({ queryKey: ['userDailySummary'] })
    },
  })
}

export function useUpdateUserDailyItemStatus(date: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ dailyItemId, request }: { dailyItemId: number; request: UpdateUserDailyItemStatusRequest }) => {
      return patchSecureApi<UserDailyItemResponse>(`/api/user-daily/items/${dailyItemId}/status`, request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDaily', date] })
    },
  })
}

export function useCreateUserDailyTimeLog(date: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateUserDailyTimeLogRequest) => postSecureApi<UserDailyTimeLogResponse>('/api/user-daily/time-logs', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDaily', date] })
      queryClient.invalidateQueries({ queryKey: ['userDailySummary'] })
    },
  })
}

export function useUpdateUserDailyTimeLog(date: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ timeLogId, request }: { timeLogId: number; request: UpdateUserDailyTimeLogRequest }) => {
      return patchSecureApi<UserDailyTimeLogResponse>(`/api/user-daily/time-logs/${timeLogId}`, request)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDaily', date] })
      queryClient.invalidateQueries({ queryKey: ['userDailySummary'] })
    },
  })
}

export function useDeleteUserDailyTimeLog(date: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (timeLogId: number) => deleteSecureApi<void>(`/api/user-daily/time-logs/${timeLogId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDaily', date] })
      queryClient.invalidateQueries({ queryKey: ['userDailySummary'] })
    },
  })
}