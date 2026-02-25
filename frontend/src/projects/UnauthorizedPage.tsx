import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-600 mb-6">
          You do not have permission to access this project. Please contact the project administrator to request access.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/projects"
            className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-indigo-700 transition"
          >
            Back to Projects
          </Link>
          <Link
            to="/dashboard"
            className="bg-gray-100 text-gray-700 px-4 py-2 text-sm font-medium rounded hover:bg-gray-200 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
