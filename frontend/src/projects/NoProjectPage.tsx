import { Link } from 'react-router-dom'

export default function NoProjectPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">No Active Projects</h1>
        <p className="text-sm text-gray-600 mb-6">
          You are not assigned to any projects yet. Please contact your administrator to get access, or create a new project.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/projects/new"
            className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-indigo-700 transition"
          >
            Create Project
          </Link>
          <Link
            to="/projects"
            className="bg-gray-100 text-gray-700 px-4 py-2 text-sm font-medium rounded hover:bg-gray-200 transition"
          >
            Browse Projects
          </Link>
        </div>
      </div>
    </div>
  )
}
