import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMeApi } from '../auth/useMeApi'
import { useAcceptProjectInvitation, useGetProjectInvitation } from './useProjectInvitations'

function formatRole(role: string) {
  return role === 'user' ? 'Project User' : 'Member'
}

function formatExpiry(expiresAt?: string) {
  if (!expiresAt) {
    return 'Permanent invitation'
  }

  return `Expires ${new Date(expiresAt).toLocaleString()}`
}

export default function ProjectInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const invitationQuery = useGetProjectInvitation(token ?? null)
  const { user, isLoading: isLoadingUser } = useMeApi()
  const { acceptProjectInvitation, isPending: isAccepting } = useAcceptProjectInvitation()

  const invitation = invitationQuery.data
  const redirectPath = invitation ? `/projects/${invitation.projectId}` : '/dashboard'
  const inviteSearch = invitation && token
    ? new URLSearchParams({ invite: token, redirect: redirectPath }).toString()
    : ''

  const handleAccept = async () => {
    if (!token || !invitation) {
      return
    }

    try {
      await acceptProjectInvitation(token)
      toast.success(`Joined ${invitation.projectName}`)
      navigate(`/projects/${invitation.projectId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invitation')
    }
  }

  if (invitationQuery.isLoading || isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="mt-3 text-sm text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (invitationQuery.isError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
            Invitation unavailable
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">This invitation link is no longer valid.</h1>
          <p className="mt-2 text-sm text-gray-600">Ask a project manager to generate a new invite link.</p>
          <div className="mt-6 flex gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go to sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl bg-indigo-950 px-8 py-10 text-white shadow-xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-indigo-100">
              Project invitation
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Join {invitation.projectName}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-indigo-100/90">
              This link grants the {formatRole(invitation.role)} role for this project. Sign in or create an account to apply it automatically.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-indigo-100/70">Role</p>
                <p className="mt-2 text-lg font-medium text-white">{formatRole(invitation.role)}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-indigo-100/70">Availability</p>
                <p className="mt-2 text-lg font-medium text-white">{formatExpiry(invitation.expiresAt)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            {user ? (
              <>
                <h2 className="text-2xl font-semibold text-gray-900">Accept invitation</h2>
                <p className="mt-2 text-sm text-gray-600">
                  You are signed in as {user.name}. Accepting will add this account to {invitation.projectName}.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {isAccepting ? 'Accepting...' : 'Accept invitation'}
                  </button>
                  <Link
                    to={redirectPath}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Open project
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-gray-900">Continue to join</h2>
                <p className="mt-2 text-sm text-gray-600">Choose how you want to continue. The invitation will be applied as part of sign in or registration.</p>
                <div className="mt-6 space-y-3">
                  <Link
                    to={inviteSearch ? `/login?${inviteSearch}` : '/login'}
                    className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-left text-sm text-indigo-900 hover:bg-indigo-100"
                  >
                    <span>
                      <span className="block font-medium">Sign in</span>
                      <span className="mt-1 block text-indigo-800/80">Use your existing PJEasy account.</span>
                    </span>
                    <span className="text-lg">→</span>
                  </Link>
                  <Link
                    to={inviteSearch ? `/register?${inviteSearch}` : '/register'}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm text-gray-900 hover:bg-gray-50"
                  >
                    <span>
                      <span className="block font-medium">Create account</span>
                      <span className="mt-1 block text-gray-600">Register first and the invitation will still be applied.</span>
                    </span>
                    <span className="text-lg">→</span>
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}