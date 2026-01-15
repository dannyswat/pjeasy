import { useMutation } from '@tanstack/react-query'
import { fetchWithAuth } from '../apis/fetch'

interface GenerateSequencesParams {
  projectId: number
}

export function useGenerateSequences() {
  return useMutation({
    mutationFn: async ({ projectId }: GenerateSequencesParams) => {
      const response = await fetchWithAuth(`/api/projects/${projectId}/sequences/generate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to generate sequences')
      }

      return response.json()
    },
  })
}
