import { ReleaseStatus } from '../releases/releaseTypes'
import { useGetRelease } from '../releases/useGetRelease'
import { useListReleases } from '../releases/useListReleases'

interface ReleaseSelectProps {
  projectId: number
  value?: number
  onChange: (value: number | undefined) => void
  label?: string
}

export default function ReleaseSelect({ projectId, value, onChange, label = 'Release' }: ReleaseSelectProps) {
  const { releases, isLoading } = useListReleases({
    projectId,
    page: 1,
    pageSize: 100,
    status: ReleaseStatus.OPEN,
  })
  const shouldLoadCurrentRelease = value !== undefined && !releases.some((release) => release.id === value)
  const { release: currentRelease } = useGetRelease(shouldLoadCurrentRelease ? value : null)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
        className="w-full h-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        <option value="">No release</option>
        {shouldLoadCurrentRelease && currentRelease && (
          <option value={currentRelease.id}>{currentRelease.version} (not open)</option>
        )}
        {releases.map((release) => (
          <option key={release.id} value={release.id}>
            {release.version}
          </option>
        ))}
      </select>
      {!isLoading && releases.length === 0 && !currentRelease && (
        <p className="mt-1 text-xs text-gray-500">No open releases available.</p>
      )}
    </div>
  )
}