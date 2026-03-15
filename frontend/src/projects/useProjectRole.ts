import { useMemo } from 'react'
import { useGetProject } from './useGetProject'
import { useMeApi } from '../auth/useMeApi'

export function useProjectRole(projectId: number | null) {
  const { members } = useGetProject(projectId)
  const { user } = useMeApi()

  return useMemo(() => {
    if (!user || !projectId || members.length === 0) {
      return { isProjectAdmin: false, isProjectUser: false, canWrite: true }
    }

    const member = members.find((m) => m.userId === user.id)
    if (!member) {
      return { isProjectAdmin: false, isProjectUser: false, canWrite: true }
    }

    const isProjectAdmin = member.isAdmin
    const isProjectUser = member.isUser && !member.isAdmin
    const canWrite = isProjectAdmin || !member.isUser

    return { isProjectAdmin, isProjectUser, canWrite }
  }, [members, user, projectId])
}
