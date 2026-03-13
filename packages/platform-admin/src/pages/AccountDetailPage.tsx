import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'
import Layout from '../components/Layout'

interface Account {
  id: string
  name: string
  email: string
  businessName: string
  phone: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Salon {
  id: string
  name: string
  address: string
  phone: string
  status: string
  createdAt: string
}

const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [salons, setSalons] = useState<Salon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Account>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateSalonModal, setShowCreateSalonModal] = useState(false)
  const [newSalon, setNewSalon] = useState({
    name: '',
    address: '',
    phone: '',
  })
  const [isCreatingSalon, setIsCreatingSalon] = useState(false)

  useEffect(() => {
    fetchAccountAndSalons()
  }, [id])

  const fetchAccountAndSalons = async () => {
    if (!id) return

    try {
      setIsLoading(true)
      const [accountRes, salonsRes] = await Promise.all([
        api.get(`/api/v1/platform/accounts/${id}`),
        api.get(`/api/v1/platform/accounts/${id}/salons`),
      ])

      setAccount(accountRes.data)
      setEditData(accountRes.data)
      setSalons(salonsRes.data.data || [])
    } catch (err: any) {
      setError('Failed to load account details')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!id) return

    try {
      setIsSaving(true)
      const response = await api.put(`/api/v1/platform/accounts/${id}`, editData)
      setAccount(response.data)
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
      setNewSalon({ name: '', address: '', phone: '' })
      setShowCreateSalonModal(false)
      await fetchAccountAndSalons()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create salon')
    } finally {
      setIsCreatingSalon(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!id) return

    if (!window.confirm('Are you sure you want to delete this account?')) {
      return
    }

    try {
      await api.delete(`/api/v1/platform/accounts/${id}`)
      navigate('/accounts')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete account')
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading account...</div>
        </div>
      </Layout>
    )
  }

  if (!account) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-600">Account not found</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-8">
        <Link to="/accounts" className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-block">
          Back to Accounts
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{account.businessName}</h1>
        <p className="text-gray-600 mt-2">Account Details</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Account Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={editData.businessName || ''}
                    onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Name</label>
                  <p className="text-gray-900 mt-1">{account.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900 mt-1">{account.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Business Name</label>
                  <p className="text-gray-900 mt-1">{account.businessName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900 mt-1">{account.phone}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Status</label>
                  <p className="text-gray-900 mt-1">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {account.status}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Created</label>
                  <p className="text-gray-900 mt-1">
                    {new Date(account.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-gray-900 mt-1">
                    {new Date(account.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Salons</h2>
              <button
                onClick={() => setShowCreateSalonModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Add Salon
              </button>
            </div>

            {salons.length === 0 ? (
              <p className="text-gray-600">No salons yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {salons.map((salon) => (
                      <tr key={salon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{salon.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{salon.address}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{salon.phone}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {salon.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(salon.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <button
              onClick={handleDeleteAccount}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showCreateSalonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Salon</h2>

            <form onSubmit={handleCreateSalon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salon Name</label>
                <input
                  type="text"
                  value={newSalon.name}
                  onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Salon Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newSalon.address}
                  onChange={(e) => setNewSalon({ ...newSalon, address: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street Address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newSalon.phone}
                  onChange={(e) => setNewSalon({ ...newSalon, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
