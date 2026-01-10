import type { UserResponse } from './userResponse'

interface UserSession {
  user: UserResponse
  sessionId: string
  accessToken: string
  refreshToken: string
}

/**
 * Hook to manage user session in localStorage
 * Encapsulates all token management logic
 */
export function useUserSession() {
  const setSession = (session: UserSession) => {
    localStorage.setItem('user', JSON.stringify(session.user))
    localStorage.setItem('session_id', session.sessionId)
    localStorage.setItem('access_token', session.accessToken)
    localStorage.setItem('refresh_token', session.refreshToken)
  }

  const getSession = (): UserSession | null => {
    const userStr = localStorage.getItem('user')
    const sessionId = localStorage.getItem('session_id')
    const accessToken = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')

    if (!userStr || !sessionId || !accessToken || !refreshToken) {
      return null
    }

    try {
      const user = JSON.parse(userStr) as UserResponse
      return { user, sessionId, accessToken, refreshToken }
    } catch {
      return null
    }
  }

  const getUser = (): UserResponse | null => {
    const session = getSession()
    return session?.user ?? null
  }

  const isAuthenticated = (): boolean => {
    return getSession() !== null
  }

  const clearSession = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('session_id')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  // Internal methods for token management (not exposed to components)
  const getTokens = () => {
    return {
      sessionId: localStorage.getItem('session_id'),
      accessToken: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refresh_token'),
    }
  }

  const updateTokens = (sessionId: string, accessToken: string, refreshToken: string) => {
    localStorage.setItem('session_id', sessionId)
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  return {
    setSession,
    getSession,
    getUser,
    isAuthenticated,
    clearSession,
    // Internal methods for hooks only
    _internal: {
      getTokens,
      updateTokens,
    },
  }
}
