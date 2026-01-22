import { useState } from 'react'
import type { FormEvent } from 'react'
import HtmlEditor from '../components/HtmlEditor'
import type { ServiceTicketResponse } from './serviceTicketTypes'
import { ServiceTicketPriority } from './serviceTicketTypes'

interface EditServiceTicketFormProps {
  serviceTicket: ServiceTicketResponse
  onSubmit: (data: { title: string; description: string; priority: string }) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

export default function EditServiceTicketForm({ serviceTicket, onSubmit, onCancel, isPending }: EditServiceTicketFormProps) {
  const [title, setTitle] = useState(serviceTicket.title)
  const [description, setDescription] = useState(serviceTicket.description)
  const [priority, setPriority] = useState(serviceTicket.priority)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onSubmit({
      title,
      description,
      priority,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500">{serviceTicket.refNum}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">Edit Service Ticket</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <HtmlEditor
              value={description}
              onChange={setDescription}
              placeholder="Enter service ticket description..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={ServiceTicketPriority.IMMEDIATE}>Immediate</option>
              <option value={ServiceTicketPriority.URGENT}>Urgent</option>
              <option value={ServiceTicketPriority.HIGH}>High</option>
              <option value={ServiceTicketPriority.NORMAL}>Normal</option>
              <option value={ServiceTicketPriority.LOW}>Low</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
