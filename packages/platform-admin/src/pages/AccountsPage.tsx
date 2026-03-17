import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import Layout from '../components/Layout'
import Pagination from '../components/Pagination'

interface Customer {
  id: string
  name: string
}

interface Account {
  id: string
  customerId: string
  username: string
  platformName: string
  status: string
  uuid: string
  lastLoginAt: string | null
  notes: string
  createdAt: string
  updatedAt: string
  customerName: string
  salonCount: number
}

interface AccountResponse {
  data: Account[]
  total: number
}

interface CreateAccountForm {
  customerId: string
  username: string
  password: string
  platformName: string
  notes: string
}

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [usernameFilter, setUsernameFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [formData, setFormData] = useState<CreateAccountForm>({
    customerId: '',
    username: '',
    password: '',
    platformName: '',
    notes: '',
  })
  const [isCreating, setIsCreating] = useState(false)

  const limit = 10

  useEffect(() => {
    fetchAccounts()
  }, [currentPage, usernameFilter])

  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      setError('')
      const params: any = {
        page: currentPage,
        pageSize: limit,
      }
      if (usernameFilter) {
        params.search = usernameFilter
      }

      const response = await api.get('/api/v1/platform/accounts', { params })
      const result = response.data?.data || response.data
      const accountsData = result.data || []
      const total = result.total || 0

      setAccounts(accountsData)
      setTotalPages(Math.ceil(total / limit))
    } catch (err: any) {
      setError('Failed to load accounts')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true)
      const response = await api.get('/api/v1/platform/customers?pageSize=100')
      const result = response.data?.data || response.data
      const customersList = Array.isArray(result) ? result : result.data || []
      setCustomers(customersList)
    } catch (err: any) {
      console.error('Failed to fetch customers:', err)
      setError('Failed to load customers list')
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true)
    if (customers.length === 0) {
      await fetchCustomers()
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customerId || !formData.username || !formData.password || !formData.platformName) {
      setError('Please fill in all required fields')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      await api.post('/api/v1/platform/accounts', {
        customerId: formData.customerId,
        username: formData.username,
        password: formData.password,
        platformName: formData.platformName,
        notes: formData.notes,
      })

      setFormData({
        customerId: '',
        username: '',
        password: '',
        platformName: '',
        notes: '',
      })
      setShowCreateModal(false)
      setCurrentPage(1)
      setSuccessMessage('Account created successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      await fetchAccounts()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUsernameFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsernameFilter(e.target.value)
    setCurrentPage(1)
  }

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === 'active') {
      return 'bg-green-100 text-green-800'
    } else if (statusLower === 'suspended') {
      return 'bg-yellow-100 text-yellow-800'
    } else if (statusLower === 'deleted') {
      return 'bg-red-100 text-red-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getPlatformColor = (platform: string) => {
    const platformLower = platform.toLowerCase()
    if (platformLower.includes('pink')) {
      return 'bg-pink-100 text-pink-800'
    } else if (platformLower.includes('blue')) {
      return 'bg-blue-100 text-blue-800'
    } else if (platformLower.includes('purple')) {
      return 'bg-purple-100 text-purple-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Accounts</h1>
          <p className="text-gray-600 mt-2">Manage salon platform accounts and access</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
        >
          Add Account
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <input
          type="text"
          placeholder="Search by username..."
          value={usernameFilter}
          onChange={handleUsernameFilterChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-600">Loading accounts...</div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-600">No accounts found</div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Username</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Platform</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Salons</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Login</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{account.customerName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{account.username}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(account.platformName)}`}>
                        {account.platformName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        {account.salonCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(account.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(account.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        to={`/accounts/${account.id}`}
                        className="text-pink-600 hover:text-pink-800 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Account</h2>

            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  disabled={loadingCustomers}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name *</label>
                <input
                  type="text"
                  value={formData.platformName}
                  onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                  placeholder="e.g., PINK PINK, Beautiful Salon"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this account"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({
                      customerId: '',
                      username: '',
                      password: '',
                      platformName: '',
                      notes: '',
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || loadingCustomers}
                  className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isCreating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default AccountsPage
