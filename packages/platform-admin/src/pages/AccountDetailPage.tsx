import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import Layout from '../components/Layout'

interface Account {
  id: string
  customerId: string
  username: string
  platformName: string
  status: string
  uuid: string
  lastLoginAt: string
  notes: string
  createdAt: string
  updatedAt: string
  customerName: string
  salons: Salon[]
}

interface Salon {
  id: string
  name: string
  subdomain: string
  status: string
  createdAt: string
}

interface SalonDetail {
  id: string
  accountId: string
  name: string
  subdomain: string
  customDomain: string
  status: string
  industry: string
  currency: string
  timezone: string
  phone: string
  email: string
  logoUrl: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zipCode: string
  country: string
  createdAt: string
  updatedAt: string
  accountUsername: string
  businessHours: any[]
  bookingSettings: any
  websiteConfig: any
}

interface SalonService {
  id: string
  name: string
  description: string
  duration: number
  price: number
  isActive: boolean
  categoryName: string
}

interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatarUrl: string
  bio: string
  isActive: boolean
}

interface Booking {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  customerName: string
  customerEmail: string
  customerPhone: string
  staffName: string
  serviceName: string
}

const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null)
  const [selectedSalonDetail, setSelectedSalonDetail] = useState<SalonDetail | null>(null)
  const [activeSubTab, setActiveSubTab] = useState('details')
  const [isLoading, setIsLoading] = useState(true)
  const [salonLoading, setSalonLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Account>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateSalonModal, setShowCreateSalonModal] = useState(false)
  const [isCreatingSalon, setIsCreatingSalon] = useState(false)
  const [newSalon, setNewSalon] = useState({
    name: '',
    subdomain: '',
    industry: '',
    currency: '',
    timezone: '',
    phone: '',
    email: '',
  })

  // Sub-tab data
  const [services, setServices] = useState<SalonService[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingTotal, setBookingTotal] = useState(0)
  const [subTabLoading, setSubTabLoading] = useState(false)

  useEffect(() => {
    fetchAccount()
  }, [id])

  const fetchAccount = async () => {
    if (!id) return
    try {
      setIsLoading(true)
      const response = await api.get(`/api/v1/platform/accounts/${id}`)
      const result = response.data?.data || response.data
      setAccount(result)
      setEditData(result)
      if (result.salons && result.salons.length > 0) {
        setSelectedSalonId(result.salons[0].id)
        fetchSalonDetail(result.salons[0].id)
      }
    } catch (err: any) {
      setError('Failed to load account details')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSalonDetail = async (salonId: string) => {
    try {
      setSalonLoading(true)
      const response = await api.get(`/api/v1/platform/salons/${salonId}`)
      const result = response.data?.data || response.data
      setSelectedSalonDetail(result)
      // Reset sub-tab to details when switching salons
      setActiveSubTab('details')
    } catch (err: any) {
      console.error('Failed to load salon details:', err)
    } finally {
      setSalonLoading(false)
    }
  }

  const fetchSubTabData = async (tab: string, salonId: string) => {
    setSubTabLoading(true)
    try {
      if (tab === 'services') {
        const res = await api.get(`/api/v1/platform/salons/${salonId}/services`)
        const result = res.data?.data || res.data
        setServices(Array.isArray(result) ? result : [])
      } else if (tab === 'staff') {
        const res = await api.get(`/api/v1/platform/salons/${salonId}/staff`)
        const result = res.data?.data || res.data
        setStaff(Array.isArray(result) ? result : [])
      } else if (tab === 'bookings') {
        const res = await api.get(`/api/v1/platform/salons/${salonId}/bookings?page=1&pageSize=20`)
        const result = res.data?.data || res.data
        setBookings(result.data || [])
        setBookingTotal(result.total || 0)
      }
    } catch (err: any) {
      console.error(`Failed to load ${tab}:`, err)
    } finally {
      setSubTabLoading(false)
    }
  }

  const handleSalonTabClick = (salonId: string) => {
    setSelectedSalonId(salonId)
    fetchSalonDetail(salonId)
  }

  const handleSubTabClick = (tab: string) => {
    setActiveSubTab(tab)
    if (selectedSalonId && tab !== 'details') {
      fetchSubTabData(tab, selectedSalonId)
    }
  }

  const handleSave = async () => {
    if (!id) return
    try {
      setIsSaving(true)
      setError('')
      await api.put(`/api/v1/platform/accounts/${id}`, {
        username: editData.username,
        platformName: editData.platformName,
        notes: editData.notes,
      })
      setIsEditing(false)
      setSuccessMessage('Account updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchAccount()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update account')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return
    const confirmMsg = newStatus === 'SUSPENDED'
      ? 'Are you sure you want to suspend this account?'
      : newStatus === 'ACTIVE'
        ? 'Are you sure you want to activate this account?'
        : 'Are you sure you want to delete this account?'
    if (!window.confirm(confirmMsg)) return

    try {
      setError('')
      if (newStatus === 'DELETED') {
        await api.delete(`/api/v1/platform/accounts/${id}`)
        navigate('/accounts')
        return
      }
      await api.put(`/api/v1/platform/accounts/${id}`, { status: newStatus })
      setSuccessMessage(`Account ${newStatus.toLowerCase()} successfully`)
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchAccount()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update account status')
    }
  }

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setIsCreatingSalon(true)
      setError('')
      await api.post(`/api/v1/platform/accounts/${id}/salons`, newSalon)
      setNewSalon({ name: '', subdomain: '', industry: '', currency: '', timezone: '', phone: '', email: '' })
      setShowCreateSalonModal(false)
      setSuccessMessage('Salon created successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchAccount()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create salon')
    } finally {
      setIsCreatingSalon(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-red-100 text-red-800',
      pending: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-blue-100 text-blue-800',
      'no-show': 'bg-orange-100 text-orange-800',
    }
    const colors = statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${colors}`}>
        {status}
      </span>
    )
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatDateTime = (d: string | null) => {
    if (!d) return 'Never'
    return new Date(d).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500 text-lg">Loading account details...</div>
        </div>
      </Layout>
    )
  }

  if (!account) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-red-600 text-lg">Account not found</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="text-sm text-gray-600">
          <Link to="/accounts" className="hover:text-gray-900">Accounts</Link>
          <span className="mx-2">/</span>
          <span>{account.username}</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">{error}</div>
      )}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">{successMessage}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Account Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{account.customerName}</h1>
                <p className="text-gray-500 text-sm mt-1">Account: {account.username}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateSalonModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  Create Salon
                </button>
              </div>
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Username</label>
                    <p className="text-gray-900 font-medium mt-1">{account.username}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Platform</label>
                    <p className="mt-1">
                      <span className="inline-block px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium rounded">
                        {account.platformName}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">UUID</label>
                    <p className="text-gray-900 font-mono text-xs mt-1 break-all">{account.uuid}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</label>
                    <p className="mt-1">
                      <Link to={`/customers/${account.customerId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {account.customerName}
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</label>
                    <p className="mt-1">{getStatusBadge(account.status)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Login</label>
                    <p className="text-gray-900 mt-1">{formatDateTime(account.lastLoginAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</label>
                    <p className="text-gray-900 mt-1">{formatDateTime(account.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</label>
                    <p className="text-gray-900 mt-1">{account.notes || '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      type="text"
                      value={editData.username || ''}
                      onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                    <input
                      type="text"
                      value={editData.platformName || ''}
                      onChange={(e) => setEditData({ ...editData, platformName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setIsEditing(false); setEditData(account) }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Salons Section */}
          {account.salons && account.salons.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Salon Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <div className="flex gap-2 overflow-x-auto">
                  {account.salons.map((salon) => (
                    <button
                      key={salon.id}
                      onClick={() => handleSalonTabClick(salon.id)}
                      className={`px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        selectedSalonId === salon.id
                          ? 'border-pink-600 text-pink-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {salon.name}
                        {getStatusBadge(salon.status)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Salon Sub-tabs */}
              <div className="flex gap-4 border-b border-gray-200 mb-6">
                {['details', 'services', 'staff', 'bookings'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleSubTabClick(tab)}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      activeSubTab === tab
                        ? 'border-pink-600 text-pink-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Salon Content */}
              {salonLoading ? (
                <div className="py-8 text-center text-gray-500">Loading salon details...</div>
              ) : selectedSalonDetail ? (
                <>
                  {/* Details Tab */}
                  {activeSubTab === 'details' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Salon Information</h3>
                        <Link
                          to={`/salons/${selectedSalonDetail.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Full Details →
                        </Link>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-200">
                            {[
                              ['Name', selectedSalonDetail.name],
                              ['Subdomain', selectedSalonDetail.subdomain],
                              ['Custom Domain', selectedSalonDetail.customDomain || '—'],
                              ['Status', null, getStatusBadge(selectedSalonDetail.status)],
                              ['Industry', selectedSalonDetail.industry],
                              ['Currency', selectedSalonDetail.currency],
                              ['Timezone', selectedSalonDetail.timezone],
                              ['Email', selectedSalonDetail.email || '—'],
                              ['Phone', selectedSalonDetail.phone || '—'],
                              ['Address', [selectedSalonDetail.addressLine1, selectedSalonDetail.city, selectedSalonDetail.state, selectedSalonDetail.country].filter(Boolean).join(', ') || '—'],
                              ['Created', formatDate(selectedSalonDetail.createdAt)],
                              ['Updated', formatDate(selectedSalonDetail.updatedAt)],
                            ].map(([label, value, badge], i) => (
                              <tr key={i}>
                                <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50 w-48">{label}</td>
                                <td className="py-3 px-4 text-gray-900">{badge || value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Services Tab */}
                  {activeSubTab === 'services' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Services</h3>
                      {subTabLoading ? (
                        <div className="py-8 text-center text-gray-500">Loading services...</div>
                      ) : services.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No services configured yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Service</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Category</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-900">Duration</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-900">Price</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {services.map((service) => (
                                <tr key={service.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{service.name}</div>
                                    {service.description && (
                                      <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{service.description}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">{service.categoryName || '—'}</td>
                                  <td className="px-4 py-3 text-right text-gray-600">{service.duration} min</td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                                    ${typeof service.price === 'number' ? service.price.toFixed(2) : service.price}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      service.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {service.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Staff Tab */}
                  {activeSubTab === 'staff' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Staff Members</h3>
                      {subTabLoading ? (
                        <div className="py-8 text-center text-gray-500">Loading staff...</div>
                      ) : staff.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No staff members found.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {staff.map((member) => (
                            <div key={member.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                  {member.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{member.name}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      member.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {member.role}
                                    </span>
                                    {!member.isActive && (
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                                    )}
                                  </div>
                                  {member.email && <p className="text-sm text-gray-500 mt-1">{member.email}</p>}
                                  {member.phone && <p className="text-sm text-gray-500">{member.phone}</p>}
                                  {member.bio && <p className="text-xs text-gray-400 mt-1 truncate">{member.bio}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bookings Tab */}
                  {activeSubTab === 'bookings' && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Bookings</h3>
                        <span className="text-sm text-gray-500">{bookingTotal} total</span>
                      </div>
                      {subTabLoading ? (
                        <div className="py-8 text-center text-gray-500">Loading bookings...</div>
                      ) : bookings.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">No bookings found.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Time</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Customer</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Service</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-900">Staff</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-900">Price</th>
                                <th className="px-4 py-3 text-center font-semibold text-gray-900">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-900">{booking.date}</td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {booking.startTime} - {booking.endTime}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-gray-900">{booking.customerName || '—'}</div>
                                    {booking.customerPhone && (
                                      <div className="text-xs text-gray-500">{booking.customerPhone}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">{booking.serviceName || '—'}</td>
                                  <td className="px-4 py-3 text-gray-600">{booking.staffName || '—'}</td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                                    ${typeof booking.totalPrice === 'number' ? booking.totalPrice.toFixed(2) : booking.totalPrice || '0.00'}
                                  </td>
                                  <td className="px-4 py-3 text-center">{getStatusBadge(booking.status)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* No Salons */}
          {(!account.salons || account.salons.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">No salons created yet for this account.</p>
              <button
                onClick={() => setShowCreateSalonModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                Create First Salon
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Actions</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Account'}
            </button>
            <button
              onClick={fetchAccount}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Refresh
            </button>

            <hr className="border-gray-200" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Status</h3>

            {account.status?.toUpperCase() !== 'SUSPENDED' && (
              <button
                onClick={() => handleStatusChange('SUSPENDED')}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
              >
                Suspend Account
              </button>
            )}
            {account.status?.toUpperCase() !== 'ACTIVE' && (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                Activate Account
              </button>
            )}
            <button
              onClick={() => handleStatusChange('DELETED')}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Create Salon Modal */}
      {showCreateSalonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Salon</h2>

            <form onSubmit={handleCreateSalon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salon Name *</label>
                <input
                  type="text"
                  value={newSalon.name}
                  onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="My Salon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain *</label>
                <input
                  type="text"
                  value={newSalon.subdomain}
                  onChange={(e) => setNewSalon({ ...newSalon, subdomain: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="mysalon"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select
                    value={newSalon.industry}
                    onChange={(e) => setNewSalon({ ...newSalon, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Select...</option>
                    <option value="nail_salon">Nail Salon</option>
                    <option value="spa">SPA</option>
                    <option value="massage">Massage</option>
                    <option value="beauty">Beauty Salon</option>
                    <option value="hair_salon">Hair Salon</option>
                    <option value="barber">Barber Shop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={newSalon.currency}
                    onChange={(e) => setNewSalon({ ...newSalon, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Select...</option>
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CNY">CNY</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={newSalon.timezone}
                  onChange={(e) => setNewSalon({ ...newSalon, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select...</option>
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                  <option value="America/Toronto">Toronto</option>
                  <option value="America/Vancouver">Vancouver</option>
                  <option value="Asia/Shanghai">China (CST)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newSalon.email}
                    onChange={(e) => setNewSalon({ ...newSalon, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="salon@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newSalon.phone}
                    onChange={(e) => setNewSalon({ ...newSalon, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateSalonModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSalon}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isCreatingSalon ? 'Creating...' : 'Create Salon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AccountDetailPage
