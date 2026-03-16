import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface Appointment {
  id: string
  date: string
  startTime: string
  duration: number
  clientName: string
  serviceName: string
  staffName: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
}

interface StaffMember {
  id: string
  name: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-400',
  CONFIRMED: 'bg-blue-400',
  IN_SERVICE: 'bg-purple-400',
  COMPLETED: 'bg-green-400',
  CANCELLED: 'bg-red-400',
  NO_SHOW: 'bg-gray-400',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const min = (i % 2) * 30
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
})

type ViewMode = 'daily' | 'weekly'

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('weekly')
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [currentDate, viewMode, selectedStaffId])

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/v1/merchant/salon/staff')
      const result = response.data?.data || response.data
      const staff = Array.isArray(result) ? result : (result.staff || [])
      setStaffList(staff.filter((s: StaffMember) => s.isActive))
    } catch {
      // silently ignore staff fetch errors
    }
  }

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      let startDate: string
      let endDate: string

      if (viewMode === 'weekly') {
        const monday = getMonday(currentDate)
        const sunday = new Date(monday)
        sunday.setDate(sunday.getDate() + 6)
        startDate = formatDate(monday)
        endDate = formatDate(sunday)
      } else {
        startDate = formatDate(currentDate)
        endDate = formatDate(currentDate)
      }

      let url = `/api/v1/merchant/salon/appointments?startDate=${startDate}&endDate=${endDate}&limit=1000`
      if (selectedStaffId !== 'all') {
        url += `&staffId=${selectedStaffId}`
      }

      const response = await api.get(url)
      const result = response.data?.data || response.data
      setAppointments(result.appointments || (Array.isArray(result) ? result : []))
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

  const getMonday = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const navigateBack = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - (viewMode === 'weekly' ? 7 : 1))
    setCurrentDate(newDate)
  }

  const navigateForward = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (viewMode === 'weekly' ? 7 : 1))
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getWeekDates = () => {
    const monday = getMonday(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(date.getDate() + i)
      return date
    })
  }

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = formatDate(date)
    return appointments.filter((apt) => apt.date === dateStr)
  }

  const getTimeSlotPosition = (time: string) => {
    const [hours, mins] = time.split(':').map(Number)
    return (hours - 8) * 2 + Math.floor(mins / 30)
  }

  const getAppointmentStyle = (apt: Appointment) => {
    const heightMultiplier = (apt.duration || 30) / 30
    return {
      top: '0px',
      height: `${heightMultiplier * 64 - 2}px`,
      zIndex: 10,
    }
  }

  const getDateRangeLabel = () => {
    if (viewMode === 'daily') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    const weekDates = getWeekDates()
    const monday = weekDates[0]
    const sunday = weekDates[6]
    return `${monday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${sunday.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`
  }

  if (loading && appointments.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </Layout>
    )
  }

  const weekDates = getWeekDates()
  const displayDates = viewMode === 'weekly' ? weekDates : [currentDate]
  const displayDays = viewMode === 'weekly' ? DAYS : [currentDate.toLocaleDateString('en-US', { weekday: 'short' })]

  return (
    <Layout>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
          {/* Top row: view toggle + navigation */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  viewMode === 'daily'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  viewMode === 'weekly'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Week
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={navigateBack}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
              >
                &larr;
              </button>
              <button
                onClick={goToToday}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Today
              </button>
              <button
                onClick={navigateForward}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
              >
                &rarr;
              </button>
            </div>

            {/* Date Range Label */}
            <h2 className="text-lg font-bold text-gray-800 min-w-48 text-center">
              {getDateRangeLabel()}
            </h2>

            {/* Staff Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Staff:</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Staff</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name || `${staff.firstName} ${staff.lastName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Header with Day Names and Dates */}
              <div className="flex border-b border-gray-200">
                <div className="w-20 bg-gray-100 border-r border-gray-200 p-4 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">Time</span>
                </div>
                {displayDates.map((date, i) => {
                  const isToday = formatDate(date) === formatDate(new Date())
                  return (
                    <div
                      key={i}
                      className={`flex-1 border-r border-gray-200 p-4 text-center ${
                        viewMode === 'daily' ? 'min-w-96' : 'min-w-56'
                      } ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}
                    >
                      <p className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                        {displayDays[i]}
                      </p>
                      <p className={`text-xs mt-1 ${isToday ? 'text-blue-500' : 'text-gray-500'}`}>
                        {date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Time Slots */}
              {TIME_SLOTS.map((time, idx) => (
                <div key={time} className="flex border-b border-gray-200 h-16">
                  <div className="w-20 bg-gray-50 border-r border-gray-200 p-2 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {time}
                  </div>
                  {displayDates.map((date, dayIdx) => {
                    const isToday = formatDate(date) === formatDate(new Date())
                    return (
                      <div
                        key={`${time}-${dayIdx}`}
                        className={`flex-1 border-r border-gray-200 relative ${
                          viewMode === 'daily' ? 'min-w-96' : 'min-w-56'
                        } ${isToday ? 'bg-blue-50 bg-opacity-30' : 'bg-white'} hover:bg-gray-50`}
                      >
                        {getAppointmentsForDay(date).map((apt) => {
                          const apptStartIdx = getTimeSlotPosition(apt.startTime)
                          if (apptStartIdx === idx) {
                            const colors = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING
                            return (
                              <div
                                key={apt.id}
                                onClick={() => setSelectedAppt(apt)}
                                className={`absolute left-0.5 right-0.5 ${colors} text-white rounded p-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden`}
                                style={getAppointmentStyle(apt)}
                              >
                                <div className="text-xs font-semibold truncate">
                                  {apt.serviceName}
                                </div>
                                <div className="text-xs truncate">{apt.clientName}</div>
                                <div className="text-xs opacity-75">{apt.staffName}</div>
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Appointment Details Modal */}
        {selectedAppt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Appointment Details</h3>
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Client Name</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedAppt.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Service</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedAppt.serviceName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Staff Member</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedAppt.staffName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedAppt.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedAppt.startTime}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedAppt.duration} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold text-white ${
                      STATUS_COLORS[selectedAppt.status] || STATUS_COLORS.PENDING
                    }`}
                  >
                    {selectedAppt.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
