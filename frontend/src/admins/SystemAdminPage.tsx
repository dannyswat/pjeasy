import { useState } from 'react'
import { useListAdmins } from './useListAdmins'
import { useAssignAdmin } from './useAssignAdmin'
import { useUnassignAdmin } from './useUnassignAdmin'

export default function SystemAdminPage() {
  const { admins, isLoading, refetch } = useListAdmins()
  const { assignAdmin, isPending: isAssigning } = useAssignAdmin()
  const { unassignAdmin, isPending: isUnassigning } = useUnassignAdmin()

  const [showAssignForm, setShowAssignForm] = useState(false)
  const [loginId, setLoginId] = useState('')
  const [expiredAfter, setExpiredAfter] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!loginId.trim()) {
      setErrorMessage('Login ID is required')
      return
    }

    try {
      const data: { loginId: string; expiredAfter?: string } = { loginId }
      if (expiredAfter) {
        data.expiredAfter = new Date(expiredAfter).toISOString()
      }

      await assignAdmin(data)
      setSuccessMessage('Admin role assigned successfully')
      setLoginId('')
      setExpiredAfter('')
      setShowAssignForm(false)
      refetch()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to assign admin role')
    }
  }

  const handleUnassignAdmin = async (userIdToRemove: number, userName: string) => {
    if (!confirm(`Are you sure you want to remove admin role from ${userName}?`)) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await unassignAdmin(userIdToRemove)
      setSuccessMessage('Admin role removed successfully')
      refetch()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to remove admin role')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">System Administrators</h1>
        <p className="text-sm text-gray-600 mt-0.5">Manage users with system administrator privileges</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded flex items-start">
          <svg className="w-4 h-4 mr-2 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded flex items-start">
          <svg className="w-4 h-4 mr-2 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Assign Admin Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-indigo-700 transition flex items-center"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Assign Admin Role
        </button>
      </div>

      {/* Assign Admin Form */}
      {showAssignForm && (
        <div className="bg-white rounded border border-gray-200 p-4 mb-4">
          <h2 className="text-base font-semibold mb-3">Assign Admin Role</h2>
          <form onSubmit={handleAssignAdmin} className="space-y-3">
            <div>
              <label htmlFor="loginId" className="block text-xs font-medium text-gray-700 mb-1.5">
                Login ID
              </label>
              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Enter user's login ID"
                required
                disabled={isAssigning}
              />
            </div>

            <div>
              <label htmlFor="expiredAfter" className="block text-xs font-medium text-gray-700 mb-1.5">
                Expiration Date (Optional)
              </label>
              <input
                id="expiredAfter"
                type="datetime-local"
                value={expiredAfter}
                onChange={(e) => setExpiredAfter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                disabled={isAssigning}
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for permanent admin role</p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAssigning}
                className="bg-indigo-600 text-white px-4 py-1.5 text-sm font-medium rounded hover:bg-indigo-700 transition disabled:bg-gray-400"
              >
                {isAssigning ? 'Assigning...' : 'Assign'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAssignForm(false)
                  setLoginId('')
                  setExpiredAfter('')
                  setErrorMessage('')
                }}
                disabled={isAssigning}
                className="bg-gray-100 text-gray-700 px-4 py-1.5 text-sm font-medium rounded hover:bg-gray-200 transition disabled:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admins List */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Login ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned At
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires At
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No system administrators assigned
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-900">{admin.user.name}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-500">{admin.user.loginId}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-500">{formatDate(admin.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs text-gray-500">
                      {admin.expiredAfter ? formatDate(admin.expiredAfter) : 'Never'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {admin.isActive ? (
                      <span className="px-2 py-0.5 inline-flex text-xs leading-tight font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 inline-flex text-xs leading-tight font-medium rounded bg-red-50 text-red-700 border border-red-200">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <button
                      onClick={() => handleUnassignAdmin(admin.userId, admin.user.name)}
                      disabled={isUnassigning}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
