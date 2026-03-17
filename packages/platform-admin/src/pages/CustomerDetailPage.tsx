import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import Layout from '../components/Layout'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  operator: string
  notes: string
  created_at: string
  updated_at: string
  accountCount: number
}

interface Account {
  id: string
  username: string
  platformName: string
  status: string
  uuid: string
  lastLoginAt: string | null
  notes: string
  createdAt: string
  salonCount: number
}

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Customer>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchCustomer()
    fetchAccounts()
  }, [id])

  const fetchCustomer = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/api/v1/platform/customers/${id}`)
      const result = response.data?.data || response.data
      setCustomer(result)
      setEditData(result)
    } catch (err: any) {
      setError('Failed to load customer')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await api.get(`/api/v1/platform/customers/${id}/accounts`)
      const result = response.data?.data || response.data
      setAccounts(Array.isArray(result) ? result : [])
    } catch (err: any) {
      console.error('Failed to load accounts:', err)
    }
  }

  const handleSave = async () => {
    if (!id) return

    try {
      setIsSaving(true)
      setError('')
      await api.put(`/api/v1/platform/customers/${id}`, {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        operator: editData.operator,
        notes: editData.notes,
      })
      setIsEditing(false)
      setSuccessMessage('Customer updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchCustomer()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update customer')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm('Are you sure you want to delete this customer? This will also affect all associated accounts.')) {
      return
    }

    try {
      await api.delete(`/api/v1/platform/customers/${id}`)
      navigate('/customers')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete customer')
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-red-100 text-red-800',
    }
    const c = colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${c}`}>
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500 text-lg">Loading customer details...</div>
        </div>
      </Layout>
    )
  }

  if (!customer) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-red-600 text-lg">Customer not found</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="text-sm text-gray-600">
          <Link to="/customers" className="hover:text-gray-900">Customers</Link>
          <span className="mx-2">/</span>
          <span>{customer.name}</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Customer Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-gray-500 text-sm mt-1">Customer ID: {customer.id}</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {customer.accountCount || 0} Accounts
                </span>
              </div>
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</label>
                    <p className="text-gray-900 font-medium mt-1">{customer.name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
                    <p className="text-gray-900 mt-1">{customer.email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</label>
                    <p className="text-gray-900 mt-1">{customer.phone || '—'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Operator</label>
                    <p className="text-gray-900 mt-1">{customer.operator || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes</label>
                    <p className="text-gray-900 mt-1">{customer.notes || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</label>
                    <p className="text-gray-900 mt-1">{formatDate(customer.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Updated At</label>
                    <p className="text-gray-900 mt-1">{formatDate(customer.updated_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Operator</label>
                    <input
                      type="text"
                      value={editData.operator || ''}
                      onChange={(e) => setEditData({ ...editData, operator: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => { setIsEditing(false); setEditData(customer) }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Linked Accounts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Linked Accounts</h2>
              <span className="text-sm text-gray-500">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
            </div>

            {accounts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No accounts linked to this customer yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Username</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Platform</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-900">Salons</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Last Login</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Created</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{account.username}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs font-medium">
                            {account.platformName}
                          </span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(account.status)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            {account.salonCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(account.lastLoginAt)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(account.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/accounts/${account.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Actions</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Customer'}
            </button>
            <button
              onClick={() => { fetchCustomer(); fetchAccounts() }}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Refresh
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              Delete Customer
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CustomerDetailPage
