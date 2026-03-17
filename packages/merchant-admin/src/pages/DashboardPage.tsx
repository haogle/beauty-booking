import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface Appointment {
  id: string
  clientName: string
  serviceName: string
  staffName: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  date: string
  time: string
  startTime?: string
  price: number
  totalPrice?: number
}

interface DashboardData {
  todayRevenue: number
  todayAppointments: number
  weekRevenue: number
  totalClients: number
  recentAppointments: Appointment[]
  upcomingAppointments: Appointment[]
}

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'IN_PROGRESS':
      return 'bg-purple-100 text-purple-800 border-purple-300'
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'NO_SHOW':
      return 'bg-gray-100 text-gray-800 border-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatTime = (timeString: string): string => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const response = await api.get('/api/v1/merchant/salon/dashboard')
        const result = response.data?.data || response.data
        setData(result || {})
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load dashboard')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <p className="font-semibold">Error loading dashboard</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </Layout>
    )
  }

  const upcomingList = data?.upcomingAppointments?.slice(0, 5) || []
  const recentList = data?.recentAppointments?.slice(0, 5) || []

  return (
    <Layout>
      <div className="space-y-8">
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Today's Revenue */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border-l-4 border-green-500 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Today's Revenue</p>
                <p className="text-3xl font-bold text-green-700">
                  ${(data?.todayRevenue || 0).toFixed(2)}
                </p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border-l-4 border-blue-500 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Today's Appointments</p>
                <p className="text-3xl font-bold text-blue-700">{data?.todayAppointments || 0}</p>
              </div>
              <span className="text-4xl">📅</span>
            </div>
          </div>

          {/* Weekly Revenue */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border-l-4 border-purple-500 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Weekly Revenue</p>
                <p className="text-3xl font-bold text-purple-700">
                  ${(data?.weekRevenue || 0).toFixed(2)}
                </p>
              </div>
              <span className="text-4xl">📊</span>
            </div>
          </div>

          {/* Total Clients */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-sm border-l-4 border-orange-500 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Total Clients</p>
                <p className="text-3xl font-bold text-orange-700">{data?.totalClients || 0}</p>
              </div>
              <span className="text-4xl">👥</span>
            </div>
          </div>
        </div>

        {/* Quick Shortcuts Grid */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {/* Appointments */}
            <Link
              to="/appointments"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-blue-200 transition-colors">
                📅
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Appointments</span>
            </Link>

            {/* Services */}
            <Link
              to="/services"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-pink-200 transition-colors">
                ✂️
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Services</span>
            </Link>

            {/* Calendar */}
            <Link
              to="/calendar"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-purple-200 transition-colors">
                📆
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Calendar</span>
            </Link>

            {/* Customers */}
            <Link
              to="/customers"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-green-200 transition-colors">
                👥
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Customers</span>
            </Link>

            {/* Gift Cards */}
            <Link
              to="/gift-cards"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-red-200 transition-colors">
                🎁
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Gift Cards</span>
            </Link>

            {/* Staff */}
            <Link
              to="/staff"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-indigo-200 transition-colors">
                👔
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Staff</span>
            </Link>

            {/* Business Hours */}
            <Link
              to="/business-hours"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-yellow-200 transition-colors">
                🕐
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Business Hours</span>
            </Link>

            {/* Website Editor */}
            <Link
              to="/website-editor"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-teal-200 transition-colors">
                🌐
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Website</span>
            </Link>

            {/* Booking Settings */}
            <Link
              to="/booking-settings"
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-cyan-200 transition-colors">
                ⚙️
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Settings</span>
            </Link>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Upcoming Appointments</h2>
            {upcomingList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {upcomingList.map((apt) => (
                  <Link
                    key={apt.id}
                    to="/appointments"
                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {apt.clientName}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{apt.serviceName}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(
                          apt.status
                        )}`}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">📅</span> {formatDate(apt.date)} at{' '}
                          {formatTime(apt.time || apt.startTime || '')}
                        </p>
                        <p>
                          <span className="font-medium">👤</span> {apt.staffName}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">${(apt.price ?? apt.totalPrice ?? 0).toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Appointments */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Appointments</h2>
            {recentList.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent appointments</p>
            ) : (
              <div className="space-y-4">
                {recentList.map((apt) => (
                  <Link
                    key={apt.id}
                    to="/appointments"
                    className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {apt.clientName}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{apt.serviceName}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(
                          apt.status
                        )}`}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="space-y-1">
                        <p>
                          <span className="font-medium">📅</span> {formatDate(apt.date)} at{' '}
                          {formatTime(apt.time || apt.startTime || '')}
                        </p>
                        <p>
                          <span className="font-medium">👤</span> {apt.staffName}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">${(apt.price ?? apt.totalPrice ?? 0).toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
