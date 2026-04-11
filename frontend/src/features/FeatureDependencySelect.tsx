import { getSecureApi } from '../apis/fetch'
import RemoteDropdown, { type RemoteDropdownPage } from '../components/RemoteDropdown'
import { useGetFeature } from './useGetFeature'
import type { FeatureResponse, FeaturesListResponse } from './featureTypes'

interface FeatureDependencySelectProps {
  projectId: number
  value?: number
  onChange: (featureId: number | undefined) => void
  excludeFeatureId?: number
}

export default function FeatureDependencySelect({ projectId, value, onChange, excludeFeatureId }: FeatureDependencySelectProps) {
  const { feature: selectedFeature } = useGetFeature(value ?? 0)

  const loadPage = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }): Promise<RemoteDropdownPage<FeatureResponse>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      dependencySelectable: 'true',
    })

    if (excludeFeatureId) {
      params.append('excludeId', excludeFeatureId.toString())
    }

    if (value) {
      params.append('selectedId', value.toString())
    }

    if (search.trim()) {
      params.append('search', search.trim())
    }

    const response = await getSecureApi<FeaturesListResponse>(`/api/projects/${projectId}/features?${params.toString()}`)

    return {
      items: response.features,
      total: response.total,
    }
  }

  return (
    <div>
      <RemoteDropdown
        label="Depends On Feature"
        placeholder="Select blocking feature"
        searchPlaceholder="Search features by ref or title"
        emptyLabel="No matching features"
        value={value}
        selectedOption={selectedFeature ?? null}
        onChange={(option) => onChange(option?.id)}
        queryKey={['remote-dropdown', 'features', projectId, excludeFeatureId ?? 'none']}
        loadPage={loadPage}
        getOptionValue={(option) => option.id}
        getOptionLabel={(option) => `[${option.refNum}] ${option.title}`}
        getOptionDescription={(option) => option.status}
        disabled={!projectId}
      />
      <p className="mt-1 text-xs text-gray-500">This feature cannot move into active work until the selected feature is completed.</p>
    </div>
  )
}