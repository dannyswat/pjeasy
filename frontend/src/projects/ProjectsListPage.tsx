import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useListProjects } from './useListProjects'

export default function ProjectsListPage() {
  const [page, setPage] = useState(1)
  const [includeArchived, setIncludeArchived] = useState(false)
  const pageSize = 20

  const { projects, total, isLoading } = useListProjects({ page, pageSize, includeArchived })

  const totalPages = Math.ceil(total / pageSize)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-600 mt-0.5">Manage your projects and teams</p>
        </div>
        <Link
          to="/projects/new"
          className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-indigo-700 transition flex items-center"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <label className="flex items-center text-xs text-gray-700">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => {
              setIncludeArchived(e.target.checked)
              setPage(1)
            }}
            className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Include archived projects
        </label>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-base font-medium text-gray-900 mb-1.5">No projects found</h3>
          <p className="text-sm text-gray-500 mb-4">Get started by creating your first project</p>
          <Link
            to="/projects/new"
            className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-indigo-700 transition"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Project
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="bg-white rounded border border-gray-200 hover:shadow-sm transition p-4 hover:border-indigo-500"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 flex-1">{project.name}</h3>
                  {project.isArchived && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-50 text-gray-600 border border-gray-200">
                      Archived
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {project.description || 'No description'}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created {formatDate(project.createdAt)}</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 border rounded text-xs font-medium ${
                        page === pageNum
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Results info */}
          <div className="mt-3 text-center text-xs text-gray-600">
            Showing {projects.length} of {total} projects
          </div>
        </>
      )}
    </div>
  )
}
