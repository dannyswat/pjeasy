import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useListProjects } from '../projects/useListProjects'
import type { ProjectResponse } from '../projects/projectTypes'

interface ProjectContextValue {
  projects: ProjectResponse[]
  allProjects: ProjectResponse[]
  selectedProjectId: number | null
  selectedProject: ProjectResponse | null
  setSelectedProjectId: (id: number) => void
  isLoading: boolean
  hasProjects: boolean
  refetch: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

const LAST_PROJECT_KEY = 'pjeasy_last_project_id'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { projects: allProjects, isLoading, refetch } = useListProjects({ pageSize: 100, includeArchived: true })
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(LAST_PROJECT_KEY)
    return stored ? parseInt(stored, 10) : null
  })

  const projects = allProjects.filter((project) => !project.isArchived)

  const setSelectedProjectId = useCallback((id: number) => {
    setSelectedProjectIdState(id)
    localStorage.setItem(LAST_PROJECT_KEY, String(id))
  }, [])

  // Auto-select first active project if none selected or selected project is not in list
  useEffect(() => {
    if (isLoading || allProjects.length === 0) return

    const isValidSelection = selectedProjectId && allProjects.some((project) => project.id === selectedProjectId)
    if (!isValidSelection) {
      const nextProjectId = projects[0]?.id ?? allProjects[0].id
      setSelectedProjectId(nextProjectId)
    }
  }, [projects, allProjects, isLoading, selectedProjectId, setSelectedProjectId])

  const selectedProject = allProjects.find((project) => project.id === selectedProjectId) ?? null

  return (
    <ProjectContext.Provider
      value={{
        projects,
        allProjects,
        selectedProjectId,
        selectedProject,
        setSelectedProjectId,
        isLoading,
        hasProjects: projects.length > 0,
        refetch,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProjectContext() {
  const ctx = useContext(ProjectContext)
  if (!ctx) {
    throw new Error('useProjectContext must be used within a ProjectProvider')
  }
  return ctx
}
