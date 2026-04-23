interface IdeaLabelBadgeProps {
  label?: string
  showIdeaPrefix?: boolean
  className?: string
}

const defaultClassName = 'px-1.5 py-0.5 text-xs font-medium rounded'

export default function IdeaLabelBadge({
  label,
  showIdeaPrefix = false,
  className = '',
}: IdeaLabelBadgeProps) {
  if (!label) {
    return null
  }

  const resolvedClassName = className || defaultClassName

  return (
    <span className={`inline-flex items-center border bg-sky-50 text-sky-700 border-sky-200 ${resolvedClassName}`}>
      {showIdeaPrefix ? `Idea: ${label}` : label}
    </span>
  )
}