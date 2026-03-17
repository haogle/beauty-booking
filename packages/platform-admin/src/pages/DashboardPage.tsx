import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import Layout from '../components/Layout'

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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to the platform admin dashboard</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </Layout>
  )
}

export default DashboardPage
