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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Administrators</h1>
        <p className="text-gray-600 mt-2">Manage users with system administrator privileges</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
          <svg className="w-5 h-5 mr-2 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <svg className="w-5 h-5 mr-2 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Assign Admin Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Assign Admin Role
        </button>
      </div>

      {/* Assign Admin Form */}
      {showAssignForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Assign Admin Role</h2>
          <form onSubmit={handleAssignAdmin} className="space-y-4">
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-2">
                Login ID
              </label>
              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Enter user's login ID"
                required
                disabled={isAssigning}
              />
            </div>

            <div>
              <label htmlFor="expiredAfter" className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date (Optional)
              </label>
              <input
                id="expiredAfter"
                type="datetime-local"
                value={expiredAfter}
                onChange={(e) => setExpiredAfter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                disabled={isAssigning}
              />
              <p className="text-sm text-gray-500 mt-1">Leave empty for permanent admin role</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isAssigning}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
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
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition disabled:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admins List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Login ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No system administrators assigned
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{admin.user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{admin.user.loginId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(admin.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {admin.expiredAfter ? formatDate(admin.expiredAfter) : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {admin.isActive ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Expired
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
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
