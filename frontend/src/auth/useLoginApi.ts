import { useMutation } from '@tanstack/react-query'
import type { UserResponse } from './userResponse'
import { useUserSession } from './useUserSession'
import { postApi } from '../apis/fetch'

interface LoginRequest {
  loginId: string
  password: string
}

interface BackendLoginResponse {
  user: UserResponse
  sessionId: string
  accessToken: string
  refreshToken: string
}

export function useLoginApi() {
  const { setSession } = useUserSession()

  const mutation = useMutation({
    mutationFn: ({ loginId, password }: LoginRequest) => 
        postApi<BackendLoginResponse>('/api/auth/login', {
            loginId: loginId,
            password: password,
        } as LoginRequest),
    onSuccess: (data) => {
      // Store session internally
      setSession({
        user: data.user,
        sessionId: data.sessionId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
    },
  })

  return {
    login: (loginId: string, password: string) => mutation.mutateAsync({ loginId, password }),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}