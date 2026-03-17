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

const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null)
  const [selectedSalonDetail, setSelectedSalonDetail] = useState<SalonDetail | null>(null)
  const [activeTab, setActiveTab] = useState('details')
  const [activeSubTab, setActiveSubTab] = useState('services')
  const [isLoading, setIsLoading] = useState(true)
  const [salonLoading, setSalonLoading] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Account>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateSalonModal, setShowCreateSalonModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
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

      // Set first salon as selected if available
      if (result.salons && result.salons.length > 0) {
        setSelectedSalonId(result.salons[0].id)
        fetchSalonDetail(result.salons[0].id)
      }
    } catch (err: any) {
      setError('Failed to load account details')
      console.error(err)
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
    } catch (err: any) {
      console.error('Failed to load salon details:', err)
    } finally {
      setSalonLoading(false)
    }
  }

  const handleSalonTabClick = (salonId: string) => {
    setSelectedSalonId(salonId)
    setActiveSubTab('services')
    fetchSalonDetail(salonId)
  }

  const handleSave = async () => {
    if (!id) return

    try {
      setIsSaving(true)
      const response = await api.put(`/api/v1/platform/accounts/${id}`, editData)
      const result = response.data?.data || response.data
      setAccount(result)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update account')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    try {
      setIsCreatingSalon(true)
      await api.post(`/api/v1/platform/accounts/${id}/salons`, newSalon)
      setNewSalon({
        name: '',
        subdomain: '',
        industry: '',
        currency: '',
        timezone: '',
        phone: '',
        email: '',
      })
      setShowCreateSalonModal(false)
      await fetchAccount()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create salon')
    } finally {
      setIsCreatingSalon(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!id) return

    if (!window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/api/v1/platform/accounts/${id}`)
      navigate('/accounts')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete account')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }
    const colors = statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${colors}`}>
        {status}
      </span>
    )
  }

  const openMerchantAdmin = () => {
    if (account?.platformName) {
      window.open(`https://${account.platformName}`, '_blank')
    }
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
          <span>Show</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Account Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{account.customerName}</h1>
                <p className="text-gray-500 text-sm mt-1">Account ID: {account.id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openMerchantAdmin}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium text-sm"
                >
                  Open App
                </button>
                <button
                  onClick={() => setShowCreateSalonModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  Create Salon
                </button>
              </div>
            </div>

            {/* Account Details Grid */}
            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Username
                    </label>
                    <p className="text-gray-900 font-medium mt-1">{account.username}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="password"
                        value="password123"
                        readOnly
                        className="px-3 py-1 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded cursor-default"
                      />
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="text-xs text-pink-600 hover:text-pink-700 font-medium"
                      >
                        Show/Hide
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Platform
                    </label>
                    <p className="mt-1">
                      <span className="inline-block px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium rounded">
                        {account.platformName}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Business User UUID
                    </label>
                    <p className="text-gray-900 font-mono text-xs mt-1 break-all">{account.uuid}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </label>
                    <p className="mt-1">{getStatusBadge(account.status)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Login
                    </label>
                    <p className="text-gray-900 mt-1">
                      {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created At
                    </label>
                    <p className="text-gray-900 mt-1">{new Date(account.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Updated At
                    </label>
                    <p className="text-gray-900 mt-1">{new Date(account.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                  <input
                    type="text"
                    value={editData.customerName || ''}
                    onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
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
                        <span className="text-xs">
                          {getStatusBadge(salon.status)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Salon Detail */}
              {salonLoading ? (
                <div className="py-8 text-center text-gray-500">Loading salon details...</div>
              ) : selectedSalonDetail ? (
                <>
                  {/* Salon Info Table */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Salon Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50 w-48">Name</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.name}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Subdomain</td>
                            <td className="py-3 px-4 text-gray-900 font-mono">{selectedSalonDetail.subdomain}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Custom Domain</td>
                            <td className="py-3 px-4 text-gray-900">
                              {selectedSalonDetail.customDomain || '—'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Status</td>
                            <td className="py-3 px-4">{getStatusBadge(selectedSalonDetail.status)}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Business Type</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.industry}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Currency</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.currency}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Timezone</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.timezone}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Email</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.email}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Phone</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.phone}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Logo</td>
                            <td className="py-3 px-4">
                              {selectedSalonDetail.logoUrl ? (
                                <a
                                  href={selectedSalonDetail.logoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 hover:text-pink-700 font-medium"
                                >
                                  View Logo
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Address</td>
                            <td className="py-3 px-4 text-gray-900">
                              {selectedSalonDetail.addressLine1}
                              {selectedSalonDetail.addressLine2 && <>, {selectedSalonDetail.addressLine2}</>}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">City</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.city}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">State/Province</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.state}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Country</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.country}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Postal Code</td>
                            <td className="py-3 px-4 text-gray-900">{selectedSalonDetail.zipCode}</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Created At</td>
                            <td className="py-3 px-4 text-gray-900">
                              {new Date(selectedSalonDetail.createdAt).toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Updated At</td>
                            <td className="py-3 px-4 text-gray-900">
                              {new Date(selectedSalonDetail.updatedAt).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Salon Sub-tabs */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex gap-4 border-b border-gray-200 mb-6">
                      {['services', 'bookings', 'staff', 'settings'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveSubTab(tab)}
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

                    {/* Sub-tab Content */}
                    <div className="py-8 text-center text-gray-500">
                      {activeSubTab === 'services' && 'Services list coming soon'}
                      {activeSubTab === 'bookings' && 'Bookings list coming soon'}
                      {activeSubTab === 'staff' && 'Staff list coming soon'}
                      {activeSubTab === 'settings' && 'Settings coming soon'}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* No Salons Message */}
          {(!account.salons || account.salons.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-gray-500">No salons created yet. Create one to get started.</p>
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
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Refresh
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Password is masked for security</h2>
            <p className="text-gray-600 text-sm mb-6">
              Passwords are not displayed in the admin panel. If the user needs to reset their password, they can do so through the merchant app.
            </p>
            <button
              onClick={() => setShowPasswordModal(false)}
              className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Salon Modal */}
      {showCreateSalonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Salon</h2>

            <form onSubmit={handleCreateSalon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salon Name</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
                <input
                  type="text"
                  value={newSalon.subdomain}
                  onChange={(e) => setNewSalon({ ...newSalon, subdomain: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="mysalon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input
                  type="text"
                  value={newSalon.industry}
                  onChange={(e) => setNewSalon({ ...newSalon, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Beauty Salon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  type="text"
                  value={newSalon.currency}
                  onChange={(e) => setNewSalon({ ...newSalon, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="USD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <input
                  type="text"
                  value={newSalon.timezone}
                  onChange={(e) => setNewSalon({ ...newSalon, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="America/New_York"
                />
              </div>

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
                  {isCreatingSalon ? 'Creating...' : 'Create'}
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
