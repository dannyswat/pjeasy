import { useState } from 'react'

interface RevokeSessionRequest {
  sessionId: string
  refreshToken: string
}

interface RevokeResult {
  success: boolean
  error?: string
}

export function useRevokeSession() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const revokeSession = async (sessionId: string, refreshToken: string): Promise<RevokeResult> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/revoke-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          refreshToken: refreshToken,
        } as RevokeSessionRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to revoke session' }))
        throw new Error(errorData.message || 'Failed to revoke session')
      }

      setLoading(false)
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while revoking session'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  const logout = async (): Promise<RevokeResult> => {
    const sessionId = localStorage.getItem('session_id')
    const refreshToken = localStorage.getItem('refresh_token')
    
    if (sessionId && refreshToken) {
      const result = await revokeSession(sessionId, refreshToken)
      // Clear local storage regardless of success
      localStorage.removeItem('user')
      localStorage.removeItem('session_id')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      return result
    }

    // Clear local storage if no tokens
    localStorage.removeItem('user')
    localStorage.removeItem('session_id')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    return { success: true }
  }

  return { revokeSession, logout, loading, error }
}
