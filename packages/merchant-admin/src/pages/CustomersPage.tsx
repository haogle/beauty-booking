import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  notes: string | null
  tags: string[]
  source: string
  totalVisits: number
  lastVisitAt: string | null
  createdAt: string
}

interface Appointment {
  id: string
  date: string
  startTime: string
  status: string
  serviceName: string
  staffName: string
  totalPrice: number
  duration: number
}

export const CustomersPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
  })

  // Detail view state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [page, search])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '20')

      const response = await api.get(`/api/v1/merchant/salon/clients?${params.toString()}`)
      const result = response.data?.data || response.data
      setClients(result.clients || (Array.isArray(result) ? result : []))
      setTotal(result.total || 0)
      setTotalPages(result.totalPages || 1)
      setError('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load customers')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchClients()
  }

  const openCreateModal = () => {
    setEditingClient(null)
    setFormData({ firstName: '', lastName: '', phone: '', email: '', notes: '' })
    setShowModal(true)
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    setFormData({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editingClient) {
        await api.put(`/api/v1/merchant/salon/clients/${editingClient.id}`, formData)
      } else {
        await api.post('/api/v1/merchant/salon/clients', formData)
      }
      setShowModal(false)
      fetchClients()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save customer')
      }
    }
  }

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}?`)) return
    try {
      await api.delete(`/api/v1/merchant/salon/clients/${client.id}`)
      fetchClients()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete customer')
      }
    }
  }

  const viewClientDetails = async (client: Client) => {
    setSelectedClient(client)
    setLoadingHistory(true)
    try {
      const response = await api.get(`/api/v1/merchant/salon/clients/${client.id}/appointments`)
      const result = response.data?.data || response.data
      setClientAppointments(Array.isArray(result) ? result : [])
    } catch {
      setClientAppointments([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    const f = firstName || ''
    const l = lastName || ''
    return `${f.charAt(0) || '?'}${l.charAt(0) || ''}`.toUpperCase()
  }

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    IN_SERVICE: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-gray-100 text-gray-800',
  }

  return (
    <Layout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Header with search and add button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
          <button
            onClick={openCreateModal}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors whitespace-nowrap"
          >
            + Add Customer
          </button>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-gray-600 text-sm">Total Customers: </span>
          <span className="text-lg font-bold text-gray-800">{total}</span>
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading customers...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No customers found</p>
            <p className="text-gray-400 mt-2">
              {search ? 'Try a different search term' : 'Add your first customer to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {getInitials(client.firstName, client.lastName)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Since {new Date(client.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.totalVisits || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {client.source || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewClientDetails(client)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(client)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-6">
                {editingClient ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Customer notes..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.firstName.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {editingClient ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client Detail Modal */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {getInitials(selectedClient.firstName, selectedClient.lastName)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      {selectedClient.firstName} {selectedClient.lastName}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Customer since {new Date(selectedClient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-800">{selectedClient.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">{selectedClient.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Visits</p>
                  <p className="font-medium text-gray-800">{selectedClient.totalVisits || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Source</p>
                  <p className="font-medium text-gray-800">{selectedClient.source || 'N/A'}</p>
                </div>
              </div>

              {selectedClient.notes && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg">{selectedClient.notes}</p>
                </div>
              )}

              {/* Appointment History */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-3">Appointment History</h4>
                {loadingHistory ? (
                  <p className="text-gray-500 text-center py-4">Loading history...</p>
                ) : clientAppointments.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No appointments yet</p>
                ) : (
                  <div className="space-y-2">
                    {clientAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{apt.serviceName}</p>
                          <p className="text-sm text-gray-500">
                            {apt.date} at {apt.startTime} &middot; {apt.staffName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {apt.status}
                          </span>
                          <p className="text-sm font-medium text-gray-700 mt-1">
                            ${Number(apt.totalPrice || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedClient(null)}
                className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
