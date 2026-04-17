import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetProject } from './useGetProject'
import { useCreateProject } from './useCreateProject'
import { useUpdateProject } from './useUpdateProject'
import { useArchiveProject, useUnarchiveProject } from './useArchiveProject'
import { useAddMember, useRemoveMember } from './useProjectMembers'
import { useGenerateSequences } from './useGenerateSequences'
import { useCreateProjectInvitation, useListProjectInvitations, useRevokeProjectInvitation } from './useProjectInvitations'
import { useProjectContext } from './ProjectContext'
import { useProjectRole } from './useProjectRole'
import StatusWorkflowSection from './StatusWorkflowSection'
import type { ProjectInvitationResponse } from './projectTypes'

async function copyTextToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

const invitationExpirationOptions = [
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '1w', label: '1 week' },
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '1y', label: '1 year' },
  { value: 'never', label: 'Not expiring' },
] as const

type InvitationExpirationOption = typeof invitationExpirationOptions[number]['value']

function formatInvitationRole(role: 'member' | 'user') {
  return role === 'user' ? 'Project User' : 'Member'
}

function getInvitationStatus(invitation: ProjectInvitationResponse) {
  if (invitation.revokedAt) {
    return { label: 'Revoked', className: 'bg-red-50 text-red-700 border-red-200' }
  }

  if (invitation.expiresAt && new Date(invitation.expiresAt).getTime() < Date.now()) {
    return { label: 'Expired', className: 'bg-amber-50 text-amber-700 border-amber-200' }
  }

  return { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

function calculateInvitationExpiry(option: InvitationExpirationOption): string | undefined {
  if (option === 'never') {
    return undefined
  }

  const expiresAt = new Date()

  switch (option) {
    case '1h':
      expiresAt.setHours(expiresAt.getHours() + 1)
      break
    case '1d':
      expiresAt.setDate(expiresAt.getDate() + 1)
      break
    case '1w':
      expiresAt.setDate(expiresAt.getDate() + 7)
      break
    case '1m':
      expiresAt.setMonth(expiresAt.getMonth() + 1)
      break
    case '3m':
      expiresAt.setMonth(expiresAt.getMonth() + 3)
      break
    case '1y':
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      break
  }

  return expiresAt.toISOString()
}

type SettingsTab = 'details' | 'members' | 'workflow'

export default function ProjectFormPage() {
  const navigate = useNavigate()
  const { setSelectedProjectId } = useProjectContext()
  const { id, projectId: projectIdParam } = useParams<{ id?: string; projectId?: string }>()
  const rawProjectId = projectIdParam ?? id
  const parsedProjectId = rawProjectId ? parseInt(rawProjectId, 10) : null
  const projectId = parsedProjectId && !Number.isNaN(parsedProjectId) ? parsedProjectId : null
  const isEditMode = projectId !== null

  const { project, members, isLoading, refetch } = useGetProject(projectId)
  const { createProject, isPending: isCreating } = useCreateProject()
  const { updateProject, isPending: isUpdating } = useUpdateProject()
  const { archiveProject, isPending: isArchiving } = useArchiveProject()
  const { unarchiveProject, isPending: isUnarchiving } = useUnarchiveProject()
  const { addMember, isPending: isAddingMember } = useAddMember()
  const { removeMember, isPending: isRemovingMember } = useRemoveMember()
  const generateSequences = useGenerateSequences()
  const { createProjectInvitation, isPending: isCreatingInvitation } = useCreateProjectInvitation()
  const invitationsQuery = useListProjectInvitations(projectId)
  const { revokeProjectInvitation, isPending: isRevokingInvitation } = useRevokeProjectInvitation()
  const { canWrite, isProjectAdmin } = useProjectRole(projectId)

  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [newMemberUserId, setNewMemberUserId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'admin' | 'user'>('member')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [invitationRole, setInvitationRole] = useState<'member' | 'user'>('member')
  const [invitationExpiration, setInvitationExpiration] = useState<InvitationExpirationOption>('never')
  const [generatedInvitation, setGeneratedInvitation] = useState<ProjectInvitationResponse | null>(null)
  const [generatedInvitationUrl, setGeneratedInvitationUrl] = useState('')
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('details')

  useEffect(() => {
    if (!project) return
    setName(project.name)
    setDescription(project.description || '')
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (isEditMode && projectId) {
        await updateProject({ projectId, data: { name, description } })
        setSuccessMessage('Project updated successfully')
        refetch()
      } else {
        const newProject = await createProject({ name, description })
        setSelectedProjectId(newProject.id)
        setSuccessMessage('Project created successfully')
        setTimeout(() => navigate(`/projects/${newProject.id}`), 1500)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Operation failed')
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!projectId) return

    if (!newMemberUserId.trim()) {
      setErrorMessage('Please enter a login ID')
      return
    }

    try {
      await addMember({
        projectId,
        data: {
          loginId: newMemberUserId,
          isAdmin: newMemberRole === 'admin',
          isUser: newMemberRole === 'user',
        },
      })
      setSuccessMessage('Member added successfully')
      setNewMemberUserId('')
      setNewMemberRole('member')
      refetch()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add member')
    }
  }

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (!projectId) return
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await removeMember({ projectId, memberId })
      setSuccessMessage('Member removed successfully')
      refetch()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to remove member')
    }
  }

  const handleArchive = async () => {
    if (!projectId) return
    if (!confirm('Are you sure you want to archive this project?')) return

    setIsActionsMenuOpen(false)

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await archiveProject(projectId)
      setSuccessMessage('Project archived successfully')
      refetch()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to archive project')
    }
  }

  const handleUnarchive = async () => {
    if (!projectId) return

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await unarchiveProject(projectId)
      setSuccessMessage('Project unarchived successfully')
      refetch()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to unarchive project')
    }
  }

  const handleGenerateSequences = async () => {
    if (!projectId) return

    setIsActionsMenuOpen(false)

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await generateSequences.mutateAsync({ projectId })
      setSuccessMessage('Sequences generated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate sequences')
    }
  }

  const handleGenerateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!projectId) return

    try {
      const response = await createProjectInvitation({
        projectId,
        data: {
          role: invitationRole,
          expiresAt: calculateInvitationExpiry(invitationExpiration),
        },
      })

      const url = response.token ? `${window.location.origin}/invite/${response.token}` : ''
      setGeneratedInvitation(response)
      setGeneratedInvitationUrl(url)
      setSuccessMessage('Invitation link generated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate invitation link')
    }
  }

  const handleCopyInvitation = async () => {
    if (!generatedInvitationUrl) {
      return
    }

    try {
      await copyTextToClipboard(generatedInvitationUrl)
      setSuccessMessage('Invitation link copied to clipboard')
    } catch {
      setErrorMessage('Failed to copy invitation link')
    }
  }

  const handleCopyInvitationFor = async (invitation: ProjectInvitationResponse) => {
    if (!invitation.token) {
      setErrorMessage('This invitation token is not available for copying')
      return
    }

    try {
      await copyTextToClipboard(`${window.location.origin}/invite/${invitation.token}`)
      setSuccessMessage('Invitation link copied to clipboard')
    } catch {
      setErrorMessage('Failed to copy invitation link')
    }
  }

  const handleRevokeInvitation = async (invitation: ProjectInvitationResponse) => {
    if (!projectId) return
    if (invitation.revokedAt) return
    if (!confirm('Are you sure you want to revoke this invitation link?')) return

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await revokeProjectInvitation({ projectId, invitationId: invitation.id })
      setSuccessMessage('Invitation link revoked successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to revoke invitation link')
    }
  }

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const isPending = isCreating || isUpdating || isArchiving || isUnarchiving || isAddingMember || isRemovingMember || generateSequences.isPending || isCreatingInvitation || isRevokingInvitation
  const tabs: Array<{ id: SettingsTab; label: string }> = isEditMode
    ? [
        { id: 'details', label: 'Project Details' },
        { id: 'members', label: 'Members' },
        { id: 'workflow', label: 'Status Workflow' },
      ]
    : [{ id: 'details', label: 'Project Details' }]

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Project' : 'Create New Project'}
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              {isEditMode ? 'Update project details and manage members' : 'Create a new project and start collaborating'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded flex items-start">
          <svg className="w-4 h-4 mr-2 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded flex items-start">
          <svg className="w-4 h-4 mr-2 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {isEditMode && (
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex flex-wrap gap-2" aria-label="Project settings sections">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-t-lg border px-4 py-2 text-sm font-medium transition ${isActive ? 'border-gray-200 border-b-white bg-white text-indigo-700' : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}

      {/* Project Form */}
      {activeTab === 'details' && (
      <div className="bg-white rounded border border-gray-200 p-4 mb-4">
        <h2 className="text-base font-semibold mb-3">Project Details</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1.5">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Enter project name"
              required
              disabled={isPending || !canWrite}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Enter project description"
              disabled={isPending || !canWrite}
            />
          </div>

          <div className="flex gap-2">
            {canWrite && (
            <button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 text-white px-4 py-1.5 text-sm font-medium rounded hover:bg-indigo-700 transition disabled:bg-gray-400"
            >
              {isEditMode ? 'Update Project' : 'Create Project'}
            </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/projects')}
              disabled={isPending}
              className="bg-gray-100 text-gray-700 px-4 py-1.5 text-sm font-medium rounded hover:bg-gray-200 transition disabled:bg-gray-200"
            >
              Cancel
            </button>
            {isEditMode && project && canWrite && (
              <>
                {project.isArchived ? (
                  <button
                    type="button"
                    onClick={handleUnarchive}
                    disabled={isPending}
                    className="ml-auto bg-sky-600 text-white px-4 py-1.5 text-sm font-medium rounded hover:bg-sky-700 transition disabled:bg-gray-400"
                  >
                    Unarchive
                  </button>
                ) : (
                  <div className="ml-auto relative">
                    <button
                      type="button"
                      onClick={() => setIsActionsMenuOpen((open) => !open)}
                      disabled={isPending}
                      className="bg-gray-100 text-gray-700 px-2.5 py-1.5 text-sm font-medium rounded hover:bg-gray-200 transition disabled:bg-gray-200"
                      aria-label="Project actions"
                    >
                      ...
                    </button>
                    {isActionsMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-sm z-10 overflow-hidden">
                        <button
                          type="button"
                          onClick={handleGenerateSequences}
                          disabled={isPending}
                          className="w-full text-left px-3 py-2 text-sm text-violet-700 hover:bg-gray-50 disabled:text-gray-400"
                        >
                          Generate Sequences
                        </button>
                        <button
                          type="button"
                          onClick={handleArchive}
                          disabled={isPending}
                          className="w-full text-left px-3 py-2 text-sm text-orange-700 hover:bg-gray-50 disabled:text-gray-400"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </form>
      </div>
      )}

      {/* Members Section - Only in Edit Mode */}
      {isEditMode && activeTab === 'members' && (
        <div className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-base font-semibold mb-3">Project Members</h2>

          {/* Add Member Form */}
          {canWrite && (
          <form onSubmit={handleAddMember} className="mb-4 p-3 bg-gray-50 rounded">
            <h3 className="text-xs font-medium text-gray-700 mb-2">Add New Member</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
                className="w-32 sm:w-48 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Login ID"
                disabled={isPending}
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as 'member' | 'admin' | 'user')}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                disabled={isPending}
              >
                <option value="member">Member</option>
                <option value="admin">Manager</option>
                <option value="user">Project User</option>
              </select>
              <button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium rounded hover:bg-indigo-700 transition disabled:bg-gray-400"
              >
                Add
              </button>
            </div>
          </form>
          )}

          {/* Members List */}
          <div className="space-y-1.5">
            {members.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-3">No members yet</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
                      {member.user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                      <p className="text-xs text-gray-500">{member.user.loginId}</p>
                    </div>
                    {member.isAdmin && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Manager
                      </span>
                    )}
                    {member.isUser && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Project User
                      </span>
                    )}
                  </div>
                  {canWrite && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.user.name)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-900 disabled:text-gray-400 text-xs font-medium"
                  >
                    Remove
                  </button>
                  )}
                </div>
              ))
            )}
          </div>

          {isProjectAdmin && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Invitation Links</h3>
              <p className="mt-1 text-xs text-gray-600">Generate a reusable link that automatically adds anyone who signs in or registers through it.</p>

              <form onSubmit={handleGenerateInvitation} className="mt-3 rounded bg-gray-50 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <div className="md:w-44">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                    <select
                      value={invitationRole}
                      onChange={(e) => setInvitationRole(e.target.value as 'member' | 'user')}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      disabled={isPending}
                    >
                      <option value="member">Member</option>
                      <option value="user">Project User</option>
                    </select>
                  </div>

                  <div className="md:flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Expiration</label>
                    <select
                      value={invitationExpiration}
                      onChange={(e) => setInvitationExpiration(e.target.value as InvitationExpirationOption)}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      disabled={isPending}
                    >
                      {invitationExpirationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-indigo-600 text-white px-4 py-1.5 text-sm font-medium rounded hover:bg-indigo-700 transition disabled:bg-gray-400"
                  >
                    {isCreatingInvitation ? 'Generating...' : 'Generate Link'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">The expiry date is calculated automatically when you generate the link.</p>
              </form>

              {generatedInvitation && generatedInvitationUrl && (
                <div className="mt-3 rounded border border-indigo-200 bg-indigo-50 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvitationUrl}
                      className="min-w-0 flex-1 rounded border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyInvitation}
                      className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Copy Link
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-indigo-900/80">
                    Grants {generatedInvitation.role === 'user' ? 'Project User' : 'Member'} access.
                    {generatedInvitation.expiresAt ? ` Expires ${new Date(generatedInvitation.expiresAt).toLocaleString()}.` : ' This link does not expire.'}
                  </p>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-900">Existing Links</h4>
                  {invitationsQuery.isLoading && <span className="text-xs text-gray-500">Loading...</span>}
                </div>

                {invitationsQuery.isError ? (
                  <p className="mt-2 text-xs text-red-600">Failed to load invitation links.</p>
                ) : invitationsQuery.data?.invitations.length ? (
                  <div className="mt-3 space-y-2">
                    {invitationsQuery.data.invitations.map((invitation) => {
                      const status = getInvitationStatus(invitation)
                      const invitationUrl = invitation.token ? `${window.location.origin}/invite/${invitation.token}` : ''

                      return (
                        <div key={invitation.id} className="rounded border border-gray-200 bg-white p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
                                  {status.label}
                                </span>
                                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                  {formatInvitationRole(invitation.role)}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                Created {invitation.createdAt ? new Date(invitation.createdAt).toLocaleString() : 'recently'}
                                {invitation.expiresAt ? ` • Expires ${new Date(invitation.expiresAt).toLocaleString()}` : ' • Permanent'}
                                {invitation.revokedAt ? ` • Revoked ${new Date(invitation.revokedAt).toLocaleString()}` : ''}
                              </p>
                              <input
                                type="text"
                                readOnly
                                value={invitationUrl}
                                className="mt-2 w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none"
                              />
                            </div>

                            <div className="flex gap-2 md:shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyInvitationFor(invitation)}
                                disabled={!invitation.token}
                                className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                              >
                                Copy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeInvitation(invitation)}
                                disabled={!!invitation.revokedAt || isPending}
                                className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                              >
                                Revoke
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">No invitation links generated yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isEditMode && projectId && activeTab === 'workflow' && (
        <StatusWorkflowSection projectId={projectId} canManage={isProjectAdmin} />
      )}
    </div>
  )
}
