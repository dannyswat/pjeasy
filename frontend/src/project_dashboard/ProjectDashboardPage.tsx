import { useParams, Link } from 'react-router-dom'
import { useGetMemberDashboard } from './useGetMemberDashboard'
import { useGetManagerDashboard } from './useGetManagerDashboard'
import { TaskStatusDisplay, TaskPriority } from '../tasks/taskTypes'
import { IssueStatusDisplay } from '../issues/issueTypes'
import { FeatureStatusDisplay } from '../features/featureTypes'

const priorityColors: Record<string, string> = {
  [TaskPriority.IMMEDIATE]: 'bg-red-100 text-red-800 border-red-200',
  [TaskPriority.URGENT]: 'bg-orange-100 text-orange-800 border-orange-200',
  [TaskPriority.HIGH]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TaskPriority.NORMAL]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TaskPriority.LOW]: 'bg-gray-100 text-gray-800 border-gray-200',
}

const statusColors: Record<string, string> = {
  'Open': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'On Hold': 'bg-orange-100 text-orange-800',
  'Blocked': 'bg-red-100 text-red-800',
  'Completed': 'bg-green-100 text-green-800',
  'Closed': 'bg-gray-100 text-gray-800',
  'Assigned': 'bg-indigo-100 text-indigo-800',
  'InProgress': 'bg-yellow-100 text-yellow-800',
  'Resolved': 'bg-green-100 text-green-800',
  'Pending': 'bg-purple-100 text-purple-800',
  'Approved': 'bg-teal-100 text-teal-800',
  'Development': 'bg-cyan-100 text-cyan-800',
  'Testing': 'bg-pink-100 text-pink-800',
  'Released': 'bg-emerald-100 text-emerald-800',
}

function getDaysUntilDeadline(deadlineStr: string | undefined): { days: number; label: string; color: string } | null {
  if (!deadlineStr) return null
  const deadline = new Date(deadlineStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  const diffTime = deadline.getTime() - today.getTime()
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (days < 0) {
    return { days: Math.abs(days), label: `${Math.abs(days)}d overdue`, color: 'text-red-600 font-medium' }
  } else if (days === 0) {
    return { days: 0, label: 'Due today', color: 'text-orange-600 font-medium' }
  } else if (days === 1) {
    return { days: 1, label: 'Due tomorrow', color: 'text-orange-500' }
  } else if (days <= 7) {
    return { days, label: `${days}d left`, color: 'text-yellow-600' }
  }
  return { days, label: `${days}d left`, color: 'text-gray-500' }
}

export default function ProjectDashboardPage() {
  const { projectId, id } = useParams<{ projectId?: string; id?: string }>()
  const resolvedProjectId = projectId || id
  const projectIdNum = resolvedProjectId ? parseInt(resolvedProjectId) : 0

  const { data: memberData, isLoading: memberLoading } = useGetMemberDashboard(projectIdNum)
  const { data: managerData, isLoading: managerLoading } = useGetManagerDashboard(projectIdNum)

  const isLoading = memberLoading || managerLoading
  const isManager = managerData?.isManager ?? false

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Project Dashboard</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {isManager ? 'Overview of project status and team progress' : 'Your assigned work and deadlines'}
        </p>
      </div>

      {/* Manager Dashboard */}
      {isManager && managerData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sprint Task Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sprint Overview</h2>
              {managerData.sprintTaskStats && (
                <Link
                  to={`/projects/${resolvedProjectId}/sprints/${managerData.sprintTaskStats.sprintId}/board`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View Board →
                </Link>
              )}
            </div>
            {managerData.sprintTaskStats ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium text-gray-900">{managerData.sprintTaskStats.sprintName}</span>
                  <span className="ml-2 text-gray-400">|</span>
                  <span className="ml-2">{managerData.sprintTaskStats.totalTasks} tasks</span>
                </p>
                <div className="space-y-2">
                  {Object.entries(managerData.sprintTaskStats.tasksByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          status === 'Completed' || status === 'Closed' ? 'bg-green-500' :
                          status === 'In Progress' ? 'bg-yellow-500' :
                          status === 'Blocked' ? 'bg-red-500' :
                          status === 'On Hold' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}></span>
                        <span className="text-sm text-gray-700">{(TaskStatusDisplay as Record<string, string>)[status] || status}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                {managerData.sprintTaskStats.totalTasks > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {Math.round(
                          ((managerData.sprintTaskStats.tasksByStatus['Completed'] || 0) +
                            (managerData.sprintTaskStats.tasksByStatus['Closed'] || 0)) /
                            managerData.sprintTaskStats.totalTasks * 100
                        )}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            ((managerData.sprintTaskStats.tasksByStatus['Completed'] || 0) +
                              (managerData.sprintTaskStats.tasksByStatus['Closed'] || 0)) /
                              managerData.sprintTaskStats.totalTasks * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No active sprint</p>
                <Link
                  to={`/projects/${resolvedProjectId}/sprints`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 mt-1 inline-block"
                >
                  Create a sprint
                </Link>
              </div>
            )}
          </div>

          {/* Service Ticket Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Service Tickets</h2>
              <Link
                to={`/projects/${resolvedProjectId}/service-tickets`}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All →
              </Link>
            </div>
            {managerData.serviceTicketStats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-600 font-medium uppercase tracking-wider">New</p>
                      <p className="text-3xl font-bold text-red-700 mt-1">{managerData.serviceTicketStats.newCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-600 font-medium uppercase tracking-wider">Open</p>
                      <p className="text-3xl font-bold text-yellow-700 mt-1">{managerData.serviceTicketStats.openCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Dashboard - My Assigned Work */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Assigned Tasks */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
            <Link
              to={`/projects/${resolvedProjectId}/tasks`}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All →
            </Link>
          </div>
          {memberData?.tasks && memberData.tasks.length > 0 ? (
            <div className="space-y-3">
              {memberData.tasks.map((task) => {
                const deadlineInfo = getDaysUntilDeadline(task.deadline)
                return (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusColors[task.status] || 'bg-gray-100 text-gray-800'}`}>
                            {(TaskStatusDisplay as Record<string, string>)[task.status] || task.status}
                          </span>
                          <span className={`inline-block px-2 py-0.5 text-xs rounded border ${priorityColors[task.priority] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      {deadlineInfo && (
                        <div className={`text-xs whitespace-nowrap ${deadlineInfo.color}`}>
                          {deadlineInfo.label}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p>No assigned tasks</p>
            </div>
          )}
        </div>

        {/* Assigned Issues */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Issues</h2>
            <Link
              to={`/projects/${resolvedProjectId}/issues`}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All →
            </Link>
          </div>
          {memberData?.issues && memberData.issues.length > 0 ? (
            <div className="space-y-3">
              {memberData.issues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/projects/${resolvedProjectId}/issues/${issue.id}`}
                  className="block border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">{issue.refNum}</span>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 truncate mt-0.5">{issue.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusColors[issue.status] || 'bg-gray-100 text-gray-800'}`}>
                          {IssueStatusDisplay[issue.status] || issue.status}
                        </span>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded border ${priorityColors[issue.priority] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                          {issue.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>No assigned issues</p>
            </div>
          )}
        </div>

        {/* Assigned Features */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Features</h2>
            <Link
              to={`/projects/${resolvedProjectId}/features`}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All →
            </Link>
          </div>
          {memberData?.features && memberData.features.length > 0 ? (
            <div className="space-y-3">
              {memberData.features.map((feature) => {
                const deadlineInfo = getDaysUntilDeadline(feature.deadline)
                return (
                  <Link
                    key={feature.id}
                    to={`/projects/${resolvedProjectId}/features/${feature.id}`}
                    className="block border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-mono">{feature.refNum}</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 truncate mt-0.5">{feature.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusColors[feature.status] || 'bg-gray-100 text-gray-800'}`}>
                            {FeatureStatusDisplay[feature.status] || feature.status}
                          </span>
                          <span className={`inline-block px-2 py-0.5 text-xs rounded border ${priorityColors[feature.priority] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                            {feature.priority}
                          </span>
                        </div>
                      </div>
                      {deadlineInfo && (
                        <div className={`text-xs whitespace-nowrap ${deadlineInfo.color}`}>
                          {deadlineInfo.label}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p>No assigned features</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
