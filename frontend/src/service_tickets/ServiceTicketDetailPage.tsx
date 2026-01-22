import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSecureApi } from '../apis/fetch'
import { useUpdateServiceTicketStatus } from './useUpdateServiceTicketStatus'
import { useDeleteServiceTicket } from './useDeleteServiceTicket'
import { useUpdateServiceTicket } from './useUpdateServiceTicket'
import { ServiceTicketStatus, ServiceTicketPriority, ServiceTicketStatusDisplay, ServiceTicketPriorityDisplay, type ServiceTicketResponse } from './serviceTicketTypes'
import EditServiceTicketForm from './EditServiceTicketForm'
import Comments from '../comments/Comments'

export default function ServiceTicketDetailPage() {
  const { projectId, ticketId } = useParams<{ projectId: string; ticketId: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<ServiceTicketResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingTicket, setEditingTicket] = useState<ServiceTicketResponse | null>(null)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const ticketIdNum = ticketId ? parseInt(ticketId) : 0
  const updateTicketStatus = useUpdateServiceTicketStatus()
  const deleteTicket = useDeleteServiceTicket()
  const updateTicket = useUpdateServiceTicket()

  const fetchTicket = async () => {
    try {
      setIsLoading(true)
      const data = await getSecureApi<ServiceTicketResponse>(
        `/api/service-tickets/${ticketIdNum}`
      )
      setTicket(data)
    } catch (error) {
      console.error('Failed to fetch service ticket:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [projectIdNum, ticketIdNum])

  const handleStatusChange = async (status: string) => {
    if (!ticket) return

    try {
      await updateTicketStatus.mutateAsync({
        ticketId: ticket.id,
        projectId: projectIdNum,
        status,
      })
      fetchTicket()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async () => {
    if (!ticket || !window.confirm('Are you sure you want to delete this service ticket?')) return

    try {
      await deleteTicket.mutateAsync({
        ticketId: ticket.id,
        projectId: projectIdNum,
      })
      navigate(`/projects/${projectId}/service-tickets`)
    } catch (error) {
      console.error('Failed to delete service ticket:', error)
    }
  }

  const handleUpdateSubmit = async (data: {
    title: string
    description: string
    priority: string
  }) => {
    if (!editingTicket) return

    try {
      await updateTicket.mutateAsync({
        ticketId: editingTicket.id,
        projectId: projectIdNum,
        ...data,
      })
      setEditingTicket(null)
      fetchTicket()
    } catch (error) {
      console.error('Failed to update service ticket:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case ServiceTicketPriority.IMMEDIATE:
        return 'bg-red-100 text-red-800 border-red-300'
      case ServiceTicketPriority.URGENT:
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case ServiceTicketPriority.HIGH:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case ServiceTicketPriority.NORMAL:
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case ServiceTicketPriority.LOW:
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 flex justify-center items-center min-h-96">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">Service Ticket Not Found</h3>
          <button
            onClick={() => navigate(`/projects/${projectId}/service-tickets`)}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Back to Service Tickets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {editingTicket ? (
        <EditServiceTicketForm
          serviceTicket={editingTicket}
          onSubmit={handleUpdateSubmit}
          onCancel={() => setEditingTicket(null)}
          isPending={updateTicket.isPending}
        />
      ) : (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => navigate(`/projects/${projectId}/service-tickets`)}
            className="flex items-center text-purple-600 hover:text-purple-700 transition text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Service Tickets
          </button>

          {/* Service Ticket Detail */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="mb-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-gray-900">{ticket.title}</h1>
                  <span className="text-xs text-gray-500">[{ticket.refNum}]</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                    ticket.status === ServiceTicketStatus.OPEN 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : ticket.status === ServiceTicketStatus.FULFILLED
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {ServiceTicketStatusDisplay[ticket.status]}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(ticket.priority)}`}>
                    {ServiceTicketPriorityDisplay[ticket.priority]}
                  </span>
                </div>
                <div className="flex items-center space-x-2 relative">
                  <button
                    onClick={() => setEditingTicket(ticket)}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition relative"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {showDeleteMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg p-3 z-10 w-48">
                        <p className="text-xs text-gray-600 mb-2">Are you sure?</p>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleDelete}
                            className="flex-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteMenu(false)}
                            className="flex-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                <span>Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.description || 'No description provided'}</p>
            </div>

            {/* Status Change Section */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Change Status</h3>
              <div className="flex space-x-2">
                {[ServiceTicketStatus.OPEN, ServiceTicketStatus.FULFILLED, ServiceTicketStatus.CLOSED].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={ticket.status === status}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                      ticket.status === status
                        ? 'bg-purple-600 text-white cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {ServiceTicketStatusDisplay[status]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <Comments itemType="ServiceTicket" itemId={ticket.id} />
        </div>
      )}
    </div>
  )
}
