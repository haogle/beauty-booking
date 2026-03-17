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

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-teal-500',
]

const TAG_COLORS = [
  'bg-red-100 text-red-800',
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-yellow-100 text-yellow-800',
  'bg-indigo-100 text-indigo-800',
  'bg-teal-100 text-teal-800',
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_SERVICE: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-800',
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
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')

  // Detail view state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [detailTab, setDetailTab] = useState<'appointments' | 'giftcards'>('appointments')
  const [editingDetail, setEditingDetail] = useState(false)
  const [detailFormData, setDetailFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
    tags: [] as string[],
  })
  const [detailTagInput, setDetailTagInput] = useState('')

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
    setFormData({ firstName: '', lastName: '', phone: '', email: '', notes: '', tags: [] })
    setTagInput('')
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
      tags: [...client.tags],
    })
    setTagInput('')
    setShowModal(true)
  }

  const handleAddTag = (setter: (data: any) => void, data: any, input: string, inputSetter: (s: string) => void) => {
    if (input.trim()) {
      const newTags = [...data.tags, input.trim()]
      setter({ ...data, tags: newTags })
      inputSetter('')
    }
  }

  const handleRemoveTag = (setter: (data: any) => void, data: any, index: number) => {
    const newTags = data.tags.filter((_: string, i: number) => i !== index)
    setter({ ...data, tags: newTags })
  }

  const handleSave = async () => {
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        tags: formData.tags,
      }

      if (editingClient) {
        await api.put(`/api/v1/merchant/salon/clients/${editingClient.id}`, payload)
      } else {
        await api.post('/api/v1/merchant/salon/clients', payload)
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

  const handleSaveDetail = async () => {
    if (!selectedClient) return
    try {
      const payload = {
        firstName: detailFormData.firstName,
        lastName: detailFormData.lastName,
        phone: detailFormData.phone,
        email: detailFormData.email,
        notes: detailFormData.notes,
        tags: detailFormData.tags,
      }

      await api.put(`/api/v1/merchant/salon/clients/${selectedClient.id}`, payload)
      setEditingDetail(false)
      // Refresh the selected client
      const response = await api.get(`/api/v1/merchant/salon/clients`)
      const result = response.data?.data || response.data
      const updated = (result.clients || (Array.isArray(result) ? result : [])).find((c: Client) => c.id === selectedClient.id)
      if (updated) {
        setSelectedClient(updated)
      }
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
    setEditingDetail(false)
    setDetailFormData({
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || '',
      tags: [...client.tags],
    })
    setDetailTagInput('')
    setDetailTab('appointments')
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

  const getAvatarColor = (firstName: string) => {
    const charCode = (firstName || 'A').charCodeAt(0)
    return AVATAR_COLORS[charCode % AVATAR_COLORS.length]
  }

  const getTagColor = (tag: string) => {
    const charCode = tag.charCodeAt(0)
    return TAG_COLORS[charCode % TAG_COLORS.length]
  }

  const truncateNotes = (notes: string | null, length: number = 60) => {
    if (!notes) return ''
    return notes.length > length ? notes.substring(0, length) + '...' : notes
  }

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
  }

  const calculateTotalSpending = (appointments: Appointment[]) => {
    return appointments
      .filter((apt) => apt.status === 'COMPLETED')
      .reduce((sum, apt) => sum + (apt.totalPrice || 0), 0)
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

        {/* Customer Grid View */}
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => viewClientDetails(client)}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-5"
                >
                  {/* Avatar and Name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-12 h-12 ${getAvatarColor(
                        client.firstName
                      )} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                    >
                      {getInitials(client.firstName, client.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {client.phone || 'No phone'}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {client.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className={`text-xs font-medium px-2 py-1 rounded-full ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                      {client.tags.length > 3 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{client.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notes Preview */}
                  {client.notes && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {truncateNotes(client.notes)}
                    </p>
                  )}

                  {/* Total Visits Badge */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Total Visits</span>
                    <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-2 py-1 rounded-full">
                      {client.totalVisits || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center border-t border-gray-200 pt-6">
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
          </>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          handleAddTag(setFormData, formData, tagInput, setTagInput)
                        }
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Add tag and press Enter"
                    />
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`text-sm font-medium px-2 py-1 rounded-full ${getTagColor(
                            tag
                          )} flex items-center gap-1`}
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(setFormData, formData, idx)}
                            className="text-xs font-bold hover:opacity-70"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
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

        {/* Client Detail Modal - Split Layout */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header with close button */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">Customer Details</h2>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                  {/* LEFT SIDE - Customer Info */}
                  <div className="lg:col-span-1">
                    {/* Avatar */}
                    <div
                      className={`w-24 h-24 ${getAvatarColor(
                        selectedClient.firstName
                      )} rounded-full flex items-center justify-center text-white font-bold text-3xl mb-4 mx-auto`}
                    >
                      {getInitials(selectedClient.firstName, selectedClient.lastName)}
                    </div>

                    {!editingDetail ? (
                      <>
                        {/* Contact Info */}
                        <div className="mb-6">
                          <h3 className="text-xl font-bold text-gray-800 mb-1">
                            {selectedClient.firstName} {selectedClient.lastName}
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-600">
                              <span className="font-medium">Phone:</span> {selectedClient.phone || '-'}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Email:</span> {selectedClient.email || '-'}
                            </p>
                          </div>
                          <button
                            onClick={() => setEditingDetail(true)}
                            className="mt-3 text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Edit Info
                          </button>
                        </div>

                        {/* Tags */}
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-2">Tags</h4>
                          {selectedClient.tags && selectedClient.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedClient.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className={`text-xs font-medium px-2 py-1 rounded-full ${getTagColor(
                                    tag
                                  )}`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No tags</p>
                          )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Total Spending</p>
                            <p className="text-lg font-bold text-blue-900">
                              ${calculateTotalSpending(clientAppointments).toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Total Visits</p>
                            <p className="text-lg font-bold text-green-900">
                              {selectedClient.totalVisits || 0}
                            </p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Last Visit</p>
                            <p className="text-sm font-bold text-purple-900">
                              {formatRelativeTime(selectedClient.lastVisitAt)}
                            </p>
                          </div>
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Customer Since</p>
                            <p className="text-sm font-bold text-orange-900">
                              {new Date(selectedClient.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Notes */}
                        {selectedClient.notes && (
                          <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                            <p className="text-sm text-gray-700">{selectedClient.notes}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Edit Mode */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              First Name
                            </label>
                            <input
                              type="text"
                              value={detailFormData.firstName}
                              onChange={(e) =>
                                setDetailFormData({
                                  ...detailFormData,
                                  firstName: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={detailFormData.lastName}
                              onChange={(e) =>
                                setDetailFormData({
                                  ...detailFormData,
                                  lastName: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={detailFormData.phone}
                              onChange={(e) =>
                                setDetailFormData({
                                  ...detailFormData,
                                  phone: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={detailFormData.email}
                              onChange={(e) =>
                                setDetailFormData({
                                  ...detailFormData,
                                  email: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>

                          {/* Tags in edit mode */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tags
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={detailTagInput}
                                onChange={(e) => setDetailTagInput(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault()
                                    handleAddTag(
                                      setDetailFormData,
                                      detailFormData,
                                      detailTagInput,
                                      setDetailTagInput
                                    )
                                  }
                                }}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Add tag"
                              />
                            </div>
                            {detailFormData.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {detailFormData.tags.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs font-medium px-2 py-1 rounded-full ${getTagColor(
                                      tag
                                    )} flex items-center gap-1`}
                                  >
                                    {tag}
                                    <button
                                      onClick={() =>
                                        handleRemoveTag(setDetailFormData, detailFormData, idx)
                                      }
                                      className="text-xs font-bold hover:opacity-70"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={detailFormData.notes}
                              onChange={(e) =>
                                setDetailFormData({
                                  ...detailFormData,
                                  notes: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              rows={3}
                              placeholder="Notes..."
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingDetail(false)}
                              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveDetail}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* RIGHT SIDE - Tabs */}
                  <div className="lg:col-span-2">
                    {/* Tab navigation */}
                    <div className="flex gap-4 border-b border-gray-200 mb-4">
                      <button
                        onClick={() => setDetailTab('appointments')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                          detailTab === 'appointments'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Appointments
                      </button>
                      <button
                        onClick={() => setDetailTab('giftcards')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                          detailTab === 'giftcards'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Gift Cards
                      </button>
                    </div>

                    {/* Appointments Tab */}
                    {detailTab === 'appointments' && (
                      <div>
                        {loadingHistory ? (
                          <p className="text-gray-500 text-center py-8">Loading appointments...</p>
                        ) : clientAppointments.length === 0 ? (
                          <p className="text-gray-400 text-center py-8">No appointments yet</p>
                        ) : (
                          <div className="space-y-3">
                            {clientAppointments.map((apt) => (
                              <div
                                key={apt.id}
                                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-800">{apt.serviceName}</p>
                                    <p className="text-sm text-gray-500">
                                      {apt.date} at {apt.startTime}
                                    </p>
                                  </div>
                                  <span
                                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                                      STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {apt.status}
                                  </span>
                                </div>
                                <div className="flex justify-between items-end text-sm">
                                  <p className="text-gray-600">{apt.staffName}</p>
                                  <p className="font-bold text-gray-800">
                                    ${Number(apt.totalPrice || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gift Cards Tab */}
                    {detailTab === 'giftcards' && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No gift cards</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              {!editingDetail && (
                <div className="border-t border-gray-200 p-6 flex gap-3">
                  <button
                    onClick={() => openEditModal(selectedClient)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(selectedClient)
                      setSelectedClient(null)
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
