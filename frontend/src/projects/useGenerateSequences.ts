import { useMutation } from '@tanstack/react-query'
import { postSecureApi } from '../apis/fetch'

interface GenerateSequencesParams {
  projectId: number
}

export function useGenerateSequences() {
  return useMutation({
    mutationFn: async ({ projectId }: GenerateSequencesParams) => {
      const data = await postSecureApi<unknown>(`/api/projects/${projectId}/sequences/generate`);
      return data;
    },
  })
}
