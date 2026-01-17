import { useGetProject } from '../projects/useGetProject'
import { useMeApi } from '../auth/useMeApi'

interface ProjectMemberSelectProps {
  projectId: number
  value?: number
  onChange: (userId: number | undefined) => void
  label?: string
  placeholder?: string
  showAssignToMe?: boolean
}

export default function ProjectMemberSelect({
  projectId,
  value,
  onChange,
  label = 'Assignee',
  placeholder = 'Select a member',
  showAssignToMe = true,
}: ProjectMemberSelectProps) {
  const { members, isLoading } = useGetProject(projectId)
  const { user } = useMeApi()

  const handleAssignToMe = () => {
    if (user) {
      onChange(user.id)
    }
  }

  if (isLoading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div className="text-sm text-gray-500">Loading members...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {showAssignToMe && user && (
          <button
            type="button"
            onClick={handleAssignToMe}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Assign to me
          </button>
        )}
      </div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        <option value="">{placeholder}</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.user.name} ({member.user.loginId})
            {member.isAdmin && ' - Admin'}
          </option>
        ))}
      </select>
    </div>
  )
}
