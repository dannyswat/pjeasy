import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useListServiceTickets } from './useListServiceTickets'
import { useCreateServiceTicket } from './useCreateServiceTicket'
import { useUpdateServiceTicket } from './useUpdateServiceTicket'
import { useDeleteServiceTicket } from './useDeleteServiceTicket'
import { ServiceTicketStatus, ServiceTicketPriority, ServiceTicketStatusDisplay, ServiceTicketPriorityDisplay, type ServiceTicketResponse } from './serviceTicketTypes'
import EditServiceTicketForm from './EditServiceTicketForm'
import CreateServiceTicketForm from './CreateServiceTicketForm'

export default function ServiceTicketsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>(ServiceTicketStatus.NEW)
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTicket, setEditingTicket] = useState<ServiceTicketResponse | null>(null)
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const pageSize = 20

  const projectIdNum = projectId ? parseInt(projectId) : 0
  const { serviceTickets, total, isLoading, refetch } = useListServiceTickets({ 
    projectId: projectIdNum, 
    page, 
    pageSize, 
    status: statusFilter,
    priority: priorityFilter 
  })
  const createServiceTicket = useCreateServiceTicket()
  const updateServiceTicket = useUpdateServiceTicket()
  const deleteServiceTicket = useDeleteServiceTicket()

  const totalPages = Math.ceil(total / pageSize)

  if (!projectId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-yellow-900 mb-2">No Project Selected</h3>
          <p className="text-yellow-700 mb-4">Please select a project to view and manage service tickets.</p>
          <button
            onClick={() => navigate('/projects')}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Go to Projects
          </button>
        </div>
      </div>
    )
  }

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCreateTitle.trim()) return

    try {
      await createServiceTicket.mutateAsync({
        projectId: projectIdNum,
        title: quickCreateTitle,
        description: '',
        priority: ServiceTicketPriority.NORMAL,
      })
      setQuickCreateTitle('')
      refetch()
    } catch (error) {
      console.error('Failed to create service ticket:', error)
    }
  }

  const handleDelete = async (ticketId: number) => {
    if (!window.confirm('Are you sure you want to delete this service ticket?')) return

    try {
      await deleteServiceTicket.mutateAsync({
        ticketId,
        projectId: projectIdNum,
      })
      refetch()
    } catch (error) {
      console.error('Failed to delete service ticket:', error)
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

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Service Tickets</h1>
        <p className="text-sm text-gray-600 mt-1">Manage service requests and support tickets</p>
      </div>

      {/* Quick Create */}
      <div className="mb-4">
        <form onSubmit={handleQuickCreate} className="flex gap-2">
          <input
            type="text"
            value={quickCreateTitle}
            onChange={(e) => setQuickCreateTitle(e.target.value)}
            placeholder="Type a service ticket and press Enter to add quickly..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!quickCreateTitle.trim() || createServiceTicket.isPending}
            className="px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Detailed
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center space-x-3">
        <label className="text-xs font-medium text-gray-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">All</option>
          <option value={ServiceTicketStatus.NEW}>New</option>
          <option value={ServiceTicketStatus.OPEN}>Open</option>
          <option value={ServiceTicketStatus.FULFILLED}>Fulfilled</option>
          <option value={ServiceTicketStatus.CLOSED}>Closed</option>
        </select>

        <label className="text-xs font-medium text-gray-700">Priority:</label>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">All</option>
          <option value={ServiceTicketPriority.IMMEDIATE}>Immediate</option>
          <option value={ServiceTicketPriority.URGENT}>Urgent</option>
          <option value={ServiceTicketPriority.HIGH}>High</option>
          <option value={ServiceTicketPriority.NORMAL}>Normal</option>
          <option value={ServiceTicketPriority.LOW}>Low</option>
        </select>
      </div>

      {/* Service Tickets List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-3 text-sm text-gray-600">Loading service tickets...</p>
          </div>
        </div>
      ) : serviceTickets.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-3 text-base font-medium text-gray-900">No service tickets yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first service ticket.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded border border-gray-200 divide-y divide-gray-200">
            {serviceTickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition group"
              >
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => navigate(`/projects/${projectId}/service-tickets/${ticket.id}`)}
                >
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition">
                      <span className="text-gray-500 mr-1.5 text-xs">[{ticket.refNum}]</span><span>{ticket.title}</span>
                    </h3>
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${
                      ticket.status === ServiceTicketStatus.NEW
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : ticket.status === ServiceTicketStatus.OPEN 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : ticket.status === ServiceTicketStatus.FULFILLED
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {ServiceTicketStatusDisplay[ticket.status]}
                    </span>
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getPriorityColor(ticket.priority)}`}>
                      {ServiceTicketPriorityDisplay[ticket.priority]}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 ml-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTicket(ticket)
                    }}
                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(ticket.id)
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} service tickets
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )
      }

      {/* Edit Modal */}
      {editingTicket && (
        <EditServiceTicketForm
          serviceTicket={editingTicket!}
          onSubmit={async (data: { title: string; description: string; priority: string }) => {
            if (!editingTicket) return
            try {
              await updateServiceTicket.mutateAsync({
                ticketId: editingTicket.id,
                projectId: projectIdNum,
                ...data,
              })
              setEditingTicket(null)
              refetch()
            } catch (error) {
              console.error('Failed to update service ticket:', error)
            }
          }}
          onCancel={() => setEditingTicket(null)}
          isPending={updateServiceTicket.isPending}
        />
      )}

      {/* Create Modal */}
      {showCreateForm && (
        <CreateServiceTicketForm
          onSubmit={async (data: { title: string; description: string; priority: string }) => {
            try {
              await createServiceTicket.mutateAsync({
                projectId: projectIdNum,
                ...data,
              })
              setShowCreateForm(false)
              refetch()
            } catch (error) {
              console.error('Failed to create service ticket:', error)
            }
          }}
          onCancel={() => setShowCreateForm(false)}
          isPending={createServiceTicket.isPending}
        />
      )}
    </div>
  )
}
