import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetProject } from './useGetProject'
import { useCreateProject } from './useCreateProject'
import { useUpdateProject } from './useUpdateProject'
import { useArchiveProject, useUnarchiveProject } from './useArchiveProject'
import { useAddMember, useRemoveMember } from './useProjectMembers'
import { useGenerateSequences } from './useGenerateSequences'

export default function ProjectFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const projectId = id ? parseInt(id) : null
  const isEditMode = projectId !== null

  const { project, members, isLoading, refetch } = useGetProject(projectId)
  const { createProject, isPending: isCreating } = useCreateProject()
  const { updateProject, isPending: isUpdating } = useUpdateProject()
  const { archiveProject, isPending: isArchiving } = useArchiveProject()
  const { unarchiveProject, isPending: isUnarchiving } = useUnarchiveProject()
  const { addMember, isPending: isAddingMember } = useAddMember()
  const { removeMember, isPending: isRemovingMember } = useRemoveMember()
  const generateSequences = useGenerateSequences()

  const [name, setName] = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [newMemberUserId, setNewMemberUserId] = useState('')
  const [newMemberIsAdmin, setNewMemberIsAdmin] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
      await addMember({ projectId, data: { loginId: newMemberUserId, isAdmin: newMemberIsAdmin } })
      setSuccessMessage('Member added successfully')
      setNewMemberUserId('')
      setNewMemberIsAdmin(false)
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

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await generateSequences.mutateAsync({ projectId })
      setSuccessMessage('Sequences generated successfully')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate sequences')
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

  const isPending = isCreating || isUpdating || isArchiving || isUnarchiving || isAddingMember || isRemovingMember || generateSequences.isPending

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
          {isEditMode && projectId && (
            <button
              onClick={() => navigate(`/projects/${projectId}/ideas`)}
              className="bg-violet-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-violet-700 transition flex items-center"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Ideas
            </button>
          )}
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

      {/* Project Form */}
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
              disabled={isPending}
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
              disabled={isPending}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 text-white px-4 py-1.5 text-sm font-medium rounded hover:bg-indigo-700 transition disabled:bg-gray-400"
            >
              {isEditMode ? 'Update Project' : 'Create Project'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              disabled={isPending}
              className="bg-gray-100 text-gray-700 px-4 py-1.5 text-sm font-medium rounded hover:bg-gray-200 transition disabled:bg-gray-200"
            >
              Cancel
            </button>
            {isEditMode && project && (
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
                  <>
                    <button
                      type="button"
                      onClick={handleGenerateSequences}
                      disabled={isPending}
                      className="ml-auto bg-violet-600 text-white px-4 py-1.5 text-sm font-medium rounded hover:bg-violet-700 transition disabled:bg-gray-400 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      Generate Sequences
                    </button>
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={isPending}
                      className="bg-orange-600 text-white px-4 py-1.5 text-sm font-medium rounded hover:bg-orange-700 transition disabled:bg-gray-400"
                    >
                      Archive
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </form>
      </div>

      {/* Members Section - Only in Edit Mode */}
      {isEditMode && (
        <div className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-base font-semibold mb-3">Project Members</h2>

          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="mb-4 p-3 bg-gray-50 rounded">
            <h3 className="text-xs font-medium text-gray-700 mb-2">Add New Member</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Login ID"
                disabled={isPending}
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newMemberIsAdmin}
                  onChange={(e) => setNewMemberIsAdmin(e.target.checked)}
                  className="mr-1.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={isPending}
                />
                <span className="text-xs text-gray-700">Admin</span>
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 text-white px-3 py-1.5 text-sm font-medium rounded hover:bg-indigo-700 transition disabled:bg-gray-400"
              >
                Add
              </button>
            </div>
          </form>

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
                        Admin
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.user.name)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-900 disabled:text-gray-400 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
