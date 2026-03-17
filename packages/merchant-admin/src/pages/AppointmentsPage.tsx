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
  clientPhone?: string
  serviceName: string
  servicePrice?: number
  staffName: string
  staffId?: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  tip?: number
  notes?: string
}

interface AppointmentsResponse {
  appointments: Appointment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Confirmation',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'Checked In',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  CONFIRMED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  IN_PROGRESS: { bg: 'bg-purple-100', text: 'text-purple-700' },
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

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [editingTip, setEditingTip] = useState(false)
  const [tipValue, setTipValue] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

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

  const callWorkflowEndpoint = async (id: string, endpoint: string, body?: any) => {
    try {
      setActionLoading(true)
      await api.patch(`/api/v1/merchant/salon/appointments/${id}/${endpoint}`, body || {})
      setSuccess(`Appointment ${endpoint} successfully`)
      setTimeout(() => setSuccess(''), 3000)
      await fetchAppointments()

      if (selectedAppointment?.id === id) {
        const updated = appointments.find(a => a.id === id)
        if (updated) setSelectedAppointment(updated)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(`Failed to ${endpoint} appointment`)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirm = (id: string) => {
    callWorkflowEndpoint(id, 'confirm')
  }

  const handleCheckIn = (id: string) => {
    callWorkflowEndpoint(id, 'checkin')
  }

  const handleComplete = (id: string) => {
    callWorkflowEndpoint(id, 'complete')
  }

  const handleCancel = (id: string) => {
    const reason = prompt('Please provide a reason for cancellation:')
    if (reason !== null) {
      callWorkflowEndpoint(id, 'cancel', { reason })
    }
  }

  const handleNoShow = (id: string) => {
    if (window.confirm('Mark this appointment as no-show?')) {
      callWorkflowEndpoint(id, 'no-show')
    }
  }

  const handleTipUpdate = async (id: string) => {
    try {
      setActionLoading(true)
      await api.patch(`/api/v1/merchant/salon/appointments/${id}/tip`, { tip: parseFloat(tipValue) || 0 })
      setSuccess('Tip updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchAppointments()

      if (selectedAppointment?.id === id) {
        const updated = appointments.find(a => a.id === id)
        if (updated) setSelectedAppointment(updated)
      }
      setEditingTip(false)
      setTipValue('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update tip')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status] || status
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
                <option value="PENDING">Pending Confirmation</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">Checked In</option>
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
                      <tr
                        key={apt.id}
                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedAppointment(apt)
                          setEditingTip(false)
                          setTipValue('')
                          setCancelReason('')
                        }}
                      >
                        <td className="px-6 py-4 text-gray-800 font-semibold">{apt.date}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.time}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.clientName}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.serviceName}</td>
                        <td className="px-6 py-4 text-gray-700">{apt.staffName}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-semibold`}
                          >
                            {getStatusLabel(apt.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedAppointment(apt)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded transition-colors"
                          >
                            View Details
                          </button>
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

      {/* Appointment Detail Drawer */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSelectedAppointment(null)}>
          <div
            className="absolute right-0 top-0 h-full w-96 bg-white shadow-lg overflow-y-auto z-50 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                <span
                  className={`${getStatusColor(selectedAppointment.status).bg} ${getStatusColor(selectedAppointment.status).text} px-6 py-3 rounded-full text-lg font-bold`}
                >
                  {getStatusLabel(selectedAppointment.status)}
                </span>
              </div>

              {/* Client Info */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Client Information</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-gray-800 font-semibold">{selectedAppointment.clientName}</p>
                  </div>
                  {selectedAppointment.clientPhone && (
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-gray-800">{selectedAppointment.clientPhone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Service Details</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Service</p>
                    <p className="text-gray-800 font-semibold">{selectedAppointment.serviceName}</p>
                  </div>
                  {selectedAppointment.servicePrice !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-gray-800">${selectedAppointment.servicePrice.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-gray-800">{selectedAppointment.duration} minutes</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Assigned Staff</p>
                    <p className="text-gray-800 font-semibold">{selectedAppointment.staffName}</p>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Date & Time</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-gray-800 font-semibold">{selectedAppointment.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-gray-800 font-semibold">{selectedAppointment.time}</p>
                  </div>
                </div>
              </div>

              {/* Tip */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Tip</h4>
                {editingTip ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tipValue}
                      onChange={(e) => setTipValue(e.target.value)}
                      placeholder="Enter tip amount"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleTipUpdate(selectedAppointment.id)}
                      disabled={actionLoading}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingTip(false)
                        setTipValue('')
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-gray-800">
                      ${(selectedAppointment.tip || 0).toFixed(2)}
                    </p>
                    <button
                      onClick={() => {
                        setEditingTip(true)
                        setTipValue((selectedAppointment.tip || 0).toString())
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Notes</h4>
                  <p className="text-gray-700 text-sm">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                {selectedAppointment.status === 'PENDING' && (
                  <button
                    onClick={() => handleConfirm(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Confirm Appointment
                  </button>
                )}

                {selectedAppointment.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCheckIn(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Check In
                  </button>
                )}

                {selectedAppointment.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleComplete(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Complete
                  </button>
                )}

                {['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(selectedAppointment.status) && (
                  <button
                    onClick={() => handleCancel(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}

                {['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(selectedAppointment.status) && (
                  <button
                    onClick={() => handleNoShow(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Mark as No Show
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </Layout>
  )
}
