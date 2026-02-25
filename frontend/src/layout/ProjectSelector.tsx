import { useNavigate, useLocation } from 'react-router-dom'
import { useProjectContext } from '../projects/ProjectContext'
import { useState, useRef, useEffect } from 'react'

export default function ProjectSelector() {
  const { projects, selectedProject, setSelectedProjectId, isLoading, hasProjects } = useProjectContext()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectProject = (projectId: number) => {
    setSelectedProjectId(projectId)
    setIsOpen(false)

    // Navigate to the same sub-page in the new project, or to the dashboard
    const match = location.pathname.match(/^\/projects\/\d+\/(.+)$/)
    if (match) {
      navigate(`/projects/${projectId}/${match[1]}`)
    } else {
      navigate(`/projects/${projectId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center text-xs text-gray-400 px-2">
        <div className="w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin mr-1.5"></div>
        Loading...
      </div>
    )
  }

  if (!hasProjects) {
    return (
      <div className="flex items-center text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded border border-gray-200">
        <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        No active projects
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 text-sm px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors max-w-50"
      >
        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="truncate font-medium text-gray-700">
          {selectedProject?.name ?? 'Select project'}
        </span>
        <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Projects
          </div>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelectProject(project.id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center space-x-2 transition-colors ${
                project.id === selectedProject?.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${project.id === selectedProject?.id ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="truncate">{project.name}</span>
              {project.id === selectedProject?.id && (
                <svg className="w-4 h-4 text-indigo-500 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { setIsOpen(false); navigate('/projects') }}
              className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>All Projects</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
