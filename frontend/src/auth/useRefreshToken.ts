import { useMutation } from '@tanstack/react-query'
import { useUserSession } from './useUserSession'

interface RefreshTokenRequest {
  sessionId: string
  refreshToken: string
}

interface RefreshTokenResponse {
  user: {
    id: number
    loginId: string
    name: string
    profileImageUrl?: string
  }
  sessionId: string
  accessToken: string
  refreshToken: string
}

async function refreshTokenRequest(sessionId: string, refreshToken: string): Promise<RefreshTokenResponse> {
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: sessionId,
      refreshToken: refreshToken,
    } as RefreshTokenRequest),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Token refresh failed' }))
    throw new Error(errorData.message || 'Failed to refresh token')
  }

  return response.json()
}

export function useRefreshToken() {
  const { setSession, _internal } = useUserSession()

  const mutation = useMutation({
    mutationFn: () => {
      const tokens = _internal.getTokens()
      if (!tokens.sessionId || !tokens.refreshToken) {
        throw new Error('No session found')
      }
      return refreshTokenRequest(tokens.sessionId, tokens.refreshToken)
    },
    onSuccess: (data) => {
      // Update session with new tokens and user data
      setSession({
        user: data.user,
        sessionId: data.sessionId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
    },
  })

  return {
    refreshToken: () => mutation.mutateAsync(),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}
