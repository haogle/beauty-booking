import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface Appointment {
  id: string
  date: string
  time: string
  startTime: string
  duration: number
  clientName: string
  serviceName: string
  staffName: string
  staffId?: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
}

interface AppointmentsResponse {
  appointments: Appointment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_SERVICE: { bg: 'bg-purple-100', text: 'text-purple-700' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
  NO_SHOW: { bg: 'bg-gray-100', text: 'text-gray-700' },
}

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterStaffId, setFilterStaffId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchAppointments()
    fetchStaff()
  }, [filterDate, filterStatus, filterStaffId, currentPage])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('date', filterDate)
      if (filterStatus !== 'ALL') params.append('status', filterStatus)
      if (filterStaffId) params.append('staffId', filterStaffId)
      params.append('page', currentPage.toString())
      params.append('limit', '20')

      const response = await api.get(
        `/api/v1/merchant/salon/appointments?${params.toString()}`
      )
      const result = response.data?.data || response.data
      setAppointments(result.appointments || (Array.isArray(result) ? result : []))
      setTotalPages(result.totalPages || 1)
      setError('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load appointments')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/v1/merchant/salon/staff')
      const result = response.data?.data || response.data
      setStaff(Array.isArray(result) ? result : (result.staff || []))
    } catch (err) {
      console.error('Failed to load staff', err)
    }
  }

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/v1/merchant/salon/appointments/${id}/status`, { status })
      setSuccess('Appointment updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchAppointments()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update appointment')
      }
    }
  }

  const handleConfirm = (id: string) => {
    updateAppointmentStatus(id, 'CONFIRMED')
  }

  const handleComplete = (id: string) => {
    updateAppointmentStatus(id, 'COMPLETED')
  }

  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      updateAppointmentStatus(id, 'CANCELLED')
    }
  }

  const handleNoShow = (id: string) => {
    if (confirm('Mark this appointment as no-show?')) {
      updateAppointmentStatus(id, 'NO_SHOW')
    }
  }

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.PENDING
  }

  if (loading && appointments.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-800">Appointments</h2>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_SERVICE">In Service</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">Staff Member</label>
              <select
                value={filterStaffId}
                onChange={(e) => {
                  setFilterStaffId(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Staff</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterDate(new Date().toISOString().split('T')[0])
                  setFilterStatus('ALL')
                  setFilterStaffId('')
                  setCurrentPage(1)
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {appointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Date</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Time</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Client Name</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Service</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Staff</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-700">Status</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => {
                    const colors = getStatusColor(apt.status)
                    return (
                      <tr key={apt.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-800 font-semibold">{apt.date}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.time}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.clientName}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.serviceName}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.staffName}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-semibold`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2 flex-wrap">
                            {apt.status === 'PENDING' && (
                              <button
                                onClick={() => handleConfirm(apt.id)}
                                className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
                              >
                                Confirm
                              </button>
                            )}
                            {(apt.status === 'CONFIRMED' || apt.status === 'IN_SERVICE') && (
                              <button
                                onClick={() => handleComplete(apt.id)}
                                className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded transition-colors"
                              >
                                Complete
                              </button>
                            )}
                            {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancel(apt.id)}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            {apt.status !== 'NO_SHOW' && apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleNoShow(apt.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white text-xs py-1 px-2 rounded transition-colors"
                              >
                                No Show
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No appointments found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <p className="text-gray-600 text-sm">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
