import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import Layout from '../components/Layout'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
}

interface DashboardStats {
  totalCustomers: number
  totalAccounts: number
  activeAccounts: number
  totalSalons: number
  activeSalons: number
  todayAppointments: number
  totalRevenue: number
  recentAccounts: Array<{
    id: string
    username: string
    platformName: string
    customerName: string
    createdAt: string
  }>
  recentSalons: Array<{
    id: string
    name: string
    subdomain: string
    status: string
    accountUsername: string
    createdAt: string
  }>
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Create Salon Wizard State
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1) // 1=Customer, 2=Account, 3=Salon
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardError, setWizardError] = useState('')

  // Customer step
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerMode, setCustomerMode] = useState<'select' | 'create'>('select')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })

  // Account step
  const [accountForm, setAccountForm] = useState({ username: '', password: '', platformName: '' })

  // Salon step
  const [salonForm, setSalonForm] = useState({
    name: '', subdomain: '', industry: 'beauty', currency: 'USD',
    timezone: 'America/New_York', phone: '', email: '',
  })

  // Created IDs for chained flow
  const [createdCustomerId, setCreatedCustomerId] = useState('')
  const [createdAccountId, setCreatedAccountId] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/api/v1/platform/dashboard')
      const result = response.data?.data || response.data
      setStats(result)
    } catch (err: any) {
      setError('Failed to load dashboard stats')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const openWizard = async () => {
    setShowWizard(true)
    setWizardStep(1)
    setWizardError('')
    setCustomerMode('select')
    setSelectedCustomerId('')
    setNewCustomer({ name: '', phone: '', email: '' })
    setAccountForm({ username: '', password: '', platformName: '' })
    setSalonForm({ name: '', subdomain: '', industry: 'beauty', currency: 'USD', timezone: 'America/New_York', phone: '', email: '' })
    setCreatedCustomerId('')
    setCreatedAccountId('')
    // Load customers
    try {
      const res = await api.get('/api/v1/platform/customers?pageSize=100')
      const result = res.data?.data || res.data
      setCustomers(result.data || [])
    } catch { setCustomers([]) }
  }

  const handleStep1Next = async () => {
    setWizardError('')
    if (customerMode === 'select') {
      if (!selectedCustomerId) { setWizardError('Please select a customer'); return }
      setCreatedCustomerId(selectedCustomerId)
      setWizardStep(2)
    } else {
      if (!newCustomer.name.trim()) { setWizardError('Customer name is required'); return }
      try {
        setWizardLoading(true)
        const res = await api.post('/api/v1/platform/customers', newCustomer)
        const created = res.data?.data || res.data
        setCreatedCustomerId(created.id)
        setWizardStep(2)
      } catch (err: any) {
        setWizardError(err?.response?.data?.message || 'Failed to create customer')
      } finally { setWizardLoading(false) }
    }
  }

  const handleStep2Next = async () => {
    setWizardError('')
    if (!accountForm.username.trim() || !accountForm.password.trim()) {
      setWizardError('Username and password are required'); return
    }
    if (accountForm.password.length < 6) {
      setWizardError('Password must be at least 6 characters'); return
    }
    try {
      setWizardLoading(true)
      const res = await api.post('/api/v1/platform/accounts', {
        customerId: createdCustomerId,
        username: accountForm.username,
        password: accountForm.password,
        platformName: accountForm.platformName || accountForm.username,
      })
      const created = res.data?.data || res.data
      setCreatedAccountId(created.id)
      setWizardStep(3)
    } catch (err: any) {
      setWizardError(err?.response?.data?.message || 'Failed to create account')
    } finally { setWizardLoading(false) }
  }

  const handleStep3Submit = async () => {
    setWizardError('')
    if (!salonForm.name.trim() || !salonForm.subdomain.trim()) {
      setWizardError('Salon name and subdomain are required'); return
    }
    try {
      setWizardLoading(true)
      const res = await api.post(`/api/v1/platform/accounts/${createdAccountId}/salons`, salonForm)
      const created = res.data?.data || res.data
      setShowWizard(false)
      fetchStats() // Refresh dashboard
      navigate(`/salons/${created.id}`)
    } catch (err: any) {
      setWizardError(err?.response?.data?.message || 'Failed to create salon')
    } finally { setWizardLoading(false) }
  }

  const autoGenerateSubdomain = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </Layout>
    )
  }

  if (!stats) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Unable to load dashboard data</p>
        </div>
      </Layout>
    )
  }

  const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon === 'users' && (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M3 20.394c0-1.019 3.694-1.933 9-1.933s9 .914 9 1.933" />
            </svg>
          )}
          {icon === 'accounts' && (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21c3 0 7-1 7-8s-4-8-7-8-7 1-7 8 4 8 7 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11c1.657 0 2 1.343 2 3s-.343 3-2 3-2-1.343-2-3 .343-3 2-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21c0-2-1.343-4-3-4" />
            </svg>
          )}
          {icon === 'building' && (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )}
          {icon === 'revenue' && (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {icon === 'calendar' && (
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to the platform admin dashboard</p>
        </div>
        <button
          onClick={openWizard}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Salon
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard label="Total Customers" value={stats.totalCustomers} icon="users" color="bg-blue-500" />
        <StatCard label="Active Accounts" value={stats.activeAccounts} icon="accounts" color="bg-green-500" />
        <StatCard label="Active Salons" value={stats.activeSalons} icon="building" color="bg-purple-500" />
        <StatCard label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} icon="revenue" color="bg-yellow-500" />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Today's Appointments" value={stats.todayAppointments} icon="calendar" color="bg-indigo-500" />
        <StatCard label="Total Salons" value={stats.totalSalons} icon="building" color="bg-pink-500" />
        <StatCard label="Total Accounts" value={stats.totalAccounts} icon="accounts" color="bg-cyan-500" />
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Accounts */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Accounts</h2>
            <Link to="/accounts" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>

          {stats.recentAccounts.length === 0 ? (
            <p className="text-gray-600 text-sm">No recent accounts</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 font-semibold text-gray-900">Username</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Platform</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Customer</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.recentAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <Link to={`/accounts/${account.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {account.username}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-600">{account.platformName}</td>
                      <td className="py-3 text-gray-600">{account.customerName}</td>
                      <td className="py-3 text-gray-600">{new Date(account.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Salons */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Salons</h2>
            <Link to="/salons" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>

          {stats.recentSalons.length === 0 ? (
            <p className="text-gray-600 text-sm">No recent salons</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Subdomain</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.recentSalons.map((salon) => (
                    <tr key={salon.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <Link to={`/salons/${salon.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {salon.name}
                        </Link>
                      </td>
                      <td className="py-3 text-gray-600">{salon.subdomain}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          salon.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : salon.status === 'SUSPENDED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {salon.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{new Date(salon.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={openWizard}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
          >
            + Create New Salon
          </button>
          <Link
            to="/customers"
            className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-center"
          >
            View All Customers
          </Link>
          <Link
            to="/accounts"
            className="px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium text-center"
          >
            View All Accounts
          </Link>
          <Link
            to="/salons"
            className="px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-center"
          >
            View All Salons
          </Link>
        </div>
      </div>

      {/* Create Salon Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            {/* Wizard Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Salon</h2>
                <button onClick={() => setShowWizard(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Step Indicator */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      wizardStep === step ? 'bg-blue-600 text-white' :
                      wizardStep > step ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {wizardStep > step ? '✓' : step}
                    </div>
                    <span className={`text-xs font-medium ${wizardStep >= step ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step === 1 ? 'Customer' : step === 2 ? 'Account' : 'Salon'}
                    </span>
                    {step < 3 && <div className={`flex-1 h-0.5 ${wizardStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Wizard Body */}
            <div className="px-6 py-6">
              {wizardError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{wizardError}</div>
              )}

              {/* Step 1: Customer */}
              {wizardStep === 1 && (
                <div>
                  <p className="text-gray-600 text-sm mb-4">Select an existing customer or create a new one.</p>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setCustomerMode('select')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                        customerMode === 'select' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      Select Existing
                    </button>
                    <button
                      onClick={() => setCustomerMode('create')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border ${
                        customerMode === 'create' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      Create New
                    </button>
                  </div>

                  {customerMode === 'select' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a customer...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                        <input type="text" value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          placeholder="e.g., Serenity Spa Group"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="text" value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Account */}
              {wizardStep === 2 && (
                <div>
                  <p className="text-gray-600 text-sm mb-4">Create a merchant account for login access.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                      <input type="text" value={accountForm.username}
                        onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                        placeholder="e.g., salon_admin"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <input type="password" value={accountForm.password}
                        onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                        placeholder="Minimum 6 characters"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
                      <input type="text" value={accountForm.platformName}
                        onChange={(e) => setAccountForm({ ...accountForm, platformName: e.target.value })}
                        placeholder="Optional display name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Salon */}
              {wizardStep === 3 && (
                <div>
                  <p className="text-gray-600 text-sm mb-4">Configure the salon details.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Salon Name *</label>
                      <input type="text" value={salonForm.name}
                        onChange={(e) => {
                          const name = e.target.value
                          setSalonForm({ ...salonForm, name, subdomain: salonForm.subdomain || autoGenerateSubdomain(name) })
                        }}
                        placeholder="e.g., Serenity Nail Spa"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain *</label>
                      <div className="flex items-center">
                        <input type="text" value={salonForm.subdomain}
                          onChange={(e) => setSalonForm({ ...salonForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-blue-500" />
                        <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">.vercel.app</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                        <select value={salonForm.industry}
                          onChange={(e) => setSalonForm({ ...salonForm, industry: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                          <option value="beauty">Beauty</option>
                          <option value="nail">Nail</option>
                          <option value="hair">Hair</option>
                          <option value="spa">Spa</option>
                          <option value="massage">Massage</option>
                          <option value="barber">Barber</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <select value={salonForm.currency}
                          onChange={(e) => setSalonForm({ ...salonForm, currency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                          <option value="CNY">CNY</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input type="text" value={salonForm.phone}
                          onChange={(e) => setSalonForm({ ...salonForm, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={salonForm.email}
                          onChange={(e) => setSalonForm({ ...salonForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => wizardStep === 1 ? setShowWizard(false) : setWizardStep(wizardStep - 1)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={wizardStep === 1 ? handleStep1Next : wizardStep === 2 ? handleStep2Next : handleStep3Submit}
                disabled={wizardLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {wizardLoading && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                {wizardStep === 3 ? 'Create Salon' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default DashboardPage
