export default function DashboardPage() {
  const stats = [
    { title: 'Total Projects', value: '24', change: '+12%', icon: '📊', color: 'green' },
    { title: 'Active Tasks', value: '156', change: '+8%', icon: '✓', color: 'blue' },
    { title: 'Team Members', value: '12', change: '+2', icon: '👥', color: 'purple' },
    { title: 'Completed', value: '89%', change: '+5%', icon: '🎯', color: 'emerald' },
  ]

  const recentProjects = [
    { name: 'Website Redesign', status: 'In Progress', progress: 65, team: 4 },
    { name: 'Mobile App', status: 'Planning', progress: 25, team: 3 },
    { name: 'Marketing Campaign', status: 'In Progress', progress: 80, team: 5 },
    { name: 'API Integration', status: 'Review', progress: 90, team: 2 },
  ]

  const activities = [
    { user: 'John Doe', action: 'completed task', project: 'Website Redesign', time: '2 hours ago' },
    { user: 'Jane Smith', action: 'created new project', project: 'Mobile App', time: '4 hours ago' },
    { user: 'Mike Johnson', action: 'updated milestone', project: 'API Integration', time: '6 hours ago' },
    { user: 'Sarah Williams', action: 'added comment', project: 'Marketing Campaign', time: '8 hours ago' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-0.5">Welcome back! Here's what's happening with your projects.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded border border-gray-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">{stat.change}</p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Projects */}
        <div className="lg:col-span-2 bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Projects</h2>
            <button className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recentProjects.map((project, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded p-3 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{project.name}</h3>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>{project.team}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div key={index} className="flex space-x-2">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">
                    {activity.user.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900">
                    <span className="font-medium">{activity.user}</span>{' '}
                    <span className="text-gray-600">{activity.action}</span>
                  </p>
                  <p className="text-xs text-indigo-600 font-medium">{activity.project}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded border border-gray-200 p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <svg className="w-6 h-6 text-indigo-600 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium text-gray-700">New Project</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <svg className="w-6 h-6 text-indigo-600 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-medium text-gray-700">Add Task</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <svg className="w-6 h-6 text-indigo-600 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-xs font-medium text-gray-700">Invite Member</span>
          </button>
          <button className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <svg className="w-6 h-6 text-indigo-600 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium text-gray-700">View Reports</span>
          </button>
        </div>
      </div>
    </div>
  )
}