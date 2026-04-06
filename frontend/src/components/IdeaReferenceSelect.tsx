import { useListIdeas } from '../ideas/useListIdeas'
import { IdeaStatus } from '../ideas/ideaTypes'

interface IdeaReferenceSelectProps {
  projectId: number
  value?: number
  onChange: (ideaId: number | undefined) => void
  label?: string
  status?: string | string[]
}

export default function IdeaReferenceSelect({
  projectId,
  value,
  onChange,
  label = 'Linked Idea',
  status = IdeaStatus.OPEN,
}: IdeaReferenceSelectProps) {
  const { ideas, isLoading } = useListIdeas({
    projectId,
    page: 1,
    pageSize: 100,
    status,
  })

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
        disabled={isLoading}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">No linked idea</option>
        {ideas.map((idea) => (
          <option key={idea.id} value={idea.id}>
            [{idea.refNum}] {idea.title}
          </option>
        ))}
      </select>
    </div>
  )
}