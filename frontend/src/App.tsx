import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DefaultLayout from './layout/DefaultLayout'
import DashboardPage from './dashboard/DashboardPage'
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
                <DefaultLayout>
                  <DashboardPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <ProjectsListPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/new"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <ProjectFormPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <ProjectDashboardPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/dashboard"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <ProjectDashboardPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/settings"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <ProjectFormPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/ideas"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <IdeasPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/ideas/:ideaId"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <IdeaDetailPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/issues"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <IssuesPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/issues/:issueId"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <IssueDetailPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/features"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <FeaturesPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/features/:featureId"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <FeatureDetailPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/wiki"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <WikiPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/wiki/:pageId"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <WikiPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/service-tickets"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <ServiceTicketsPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/service-tickets/:ticketId"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <ServiceTicketDetailPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/tasks"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <TasksPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/sprints"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <SprintsPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/sprints/:sprintId/board"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <SprintBoardPage />
                </DefaultLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system-admins"
            element={
              <ProtectedRoute>
                <DefaultLayout>
                  <SystemAdminPage />
                </DefaultLayout>
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

