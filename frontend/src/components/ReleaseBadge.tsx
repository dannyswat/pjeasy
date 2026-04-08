import { ReleaseStatusDisplay } from '../releases/releaseTypes'
import { useGetRelease } from '../releases/useGetRelease'

interface ReleaseBadgeProps {
  releaseId?: number
}

export default function ReleaseBadge({ releaseId }: ReleaseBadgeProps) {
  const { release, isLoading } = useGetRelease(releaseId ?? null)

  if (!releaseId) {
    return null
  }

  if (isLoading) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded border bg-slate-50 text-slate-500 border-slate-200"></span>
    )
  }

  if (!release) {
    return null
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border bg-slate-50 text-slate-700 border-slate-200"
      title={`Release ${release.version} · ${ReleaseStatusDisplay[release.status] || release.status}`}
    >
      <span className="font-mono">{release.version}</span>
    </span>
  )
}