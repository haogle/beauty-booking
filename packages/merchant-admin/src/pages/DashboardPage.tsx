import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface DashboardStats {
  totalBookings?: number
  upcomingBookings?: number
  totalCustomers?: number
  revenue?: number
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await api.get('/api/v1/merchant/dashboard/stats')
        const result = response.data?.data || response.data
        setStats(result || {})
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load dashboard stats')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <Layout>
      <div className="space-y-6">
        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Total Bookings
              </h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats.totalBookings || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Upcoming Bookings
              </h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.upcomingBookings || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Total Customers
              </h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.totalCustomers || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Revenue
              </h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                ${(stats.revenue || 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Welcome to Your Dashboard</h2>
          <p className="text-gray-600 mb-4">
            Use the sidebar navigation to manage your services, staff, appointments, and salon settings.
          </p>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">→</span>
              <span>Go to Services to manage service categories, services, and add-ons</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">→</span>
              <span>Go to Staff to manage staff members, their services, and work hours</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">→</span>
              <span>Go to Appointments to view and manage all client appointments</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">→</span>
              <span>Go to Calendar to view appointments in a weekly calendar view</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-600 mr-2">→</span>
              <span>Go to Salon Settings to update your salon information</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
