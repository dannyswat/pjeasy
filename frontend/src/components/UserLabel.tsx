import { useGetUser } from '../users/useGetUserApi'

interface UserLabelProps {
  userId: number
}

export function UserLabel({ userId }: UserLabelProps) {
  const { data: user, isLoading, error } = useGetUser(userId)

  if (isLoading) {
    return <span className="text-gray-500">Loading...</span>
  }

  if (error || !user) {
    return <span className="text-gray-500">Unknown User</span>
  }

  return <span>{user.name}</span>
}
