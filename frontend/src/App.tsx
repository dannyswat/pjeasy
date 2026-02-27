import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DefaultLayout from './layout/DefaultLayout'
import LoginPage from './auth/LoginPage'
import RegisterPage from './users/RegisterPage'
import SystemAdminPage from './admins/SystemAdminPage'
import ProjectsListPage from './projects/ProjectsListPage'
import ProjectFormPage from './projects/ProjectFormPage'
import IdeasPage from './ideas/IdeasPage'
import IssuesPage from './issues/IssuesPage'
import ServiceTicketsPage from './service_tickets/ServiceTicketsPage'
import TasksPage from './tasks/TasksPage'
import SprintsPage from './sprints/SprintsPage'
import SprintDefaultPage from './sprints/SprintDefaultPage'
import SprintBoardPage from './sprints/SprintBoardPage'
import ProjectDashboardPage from './project_dashboard/ProjectDashboardPage'
import { useMeApi } from './auth/useMeApi'
import { useUserSession } from './auth/useUserSession'
import { useEffect } from 'react'
import IssueDetailPage from './issues/IssueDetailPage'
import IdeaDetailPage from './ideas/IdeaDetailPage'
import ServiceTicketDetailPage from './service_tickets/ServiceTicketDetailPage'
import FeaturesPage from './features/FeaturesPage'
import FeatureDetailPage from './features/FeatureDetailPage'
import WikiPage from './wiki/WikiPage'
import ReviewsPage from './reviews/ReviewsPage'
import ReviewDetailPage from './reviews/ReviewDetailPage'
import { ProjectProvider, useProjectContext } from './projects/ProjectContext'
import NoProjectPage from './projects/NoProjectPage'
import UnauthorizedPage from './projects/UnauthorizedPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isError } = useMeApi()
  const { clearSession } = useUserSession()

  useEffect(() => {
    // If token is invalid or expired, clear session
    if (isError) {
      clearSession()
    }
  }, [isError, clearSession])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useMeApi()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is already authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

/**
 * Redirects to the user's selected/last-visited project dashboard.
 * Shows NoProjectPage if the user has no projects assigned.
 */
function ProjectRedirect() {
  const { selectedProjectId, isLoading, hasProjects } = useProjectContext()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-sm text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (!hasProjects) {
    return <NoProjectPage />
  }

  if (selectedProjectId) {
    return <Navigate to={`/projects/${selectedProjectId}`} replace />
  }

  return <NoProjectPage />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <AuthRedirect>
                <LoginPage />
              </AuthRedirect>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRedirect>
                <RegisterPage />
              </AuthRedirect>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ProjectRedirect />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ProjectsListPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/new"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ProjectFormPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/unauthorized"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <UnauthorizedPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ProjectDashboardPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/dashboard"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ProjectDashboardPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/settings"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ProjectFormPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/ideas"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <IdeasPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/ideas/:ideaId"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <IdeaDetailPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/issues"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <IssuesPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/issues/:issueId"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <IssueDetailPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/features"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <FeaturesPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/features/:featureId"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <FeatureDetailPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/wiki"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <WikiPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/wiki/:pageId"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <WikiPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/service-tickets"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ServiceTicketsPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/service-tickets/:ticketId"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ServiceTicketDetailPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/tasks"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <TasksPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/sprints"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <SprintDefaultPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/sprints/list"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <SprintsPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/sprints/:sprintId/board"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <SprintBoardPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/reviews"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ReviewsPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/reviews/:reviewId"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <ReviewDetailPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system-admins"
            element={
              <ProtectedRoute>
                <ProjectProvider>
                  <DefaultLayout>
                    <SystemAdminPage />
                  </DefaultLayout>
                </ProjectProvider>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

