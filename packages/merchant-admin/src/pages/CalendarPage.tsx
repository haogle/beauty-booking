import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface Appointment {
  id: string
  date: string
  startTime: string
  endTime?: string
  duration: number
  clientId: string
  clientName: string
  serviceName: string
  serviceId?: string
  staffId: string
  staffName: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  price?: number
  tip?: number
  notes?: string
}

interface TimeBlock {
  id: string
  staffId: string
  staffName: string
  date: string
  startTime: string
  endTime: string
  reason: string
}

interface StaffMember {
  id: string
  name: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
}

interface Service {
  id: string
  name: string
  price: number
  duration: number
  categoryId?: string
  categoryName?: string
}

interface Client {
  id: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
}

interface MonthDay {
  date: Date
  isCurrentMonth: boolean
  appointments: Appointment[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-400 text-yellow-900',
  CONFIRMED: 'bg-blue-400 text-blue-900',
  IN_PROGRESS: 'bg-purple-400 text-purple-900',
  COMPLETED: 'bg-green-400 text-green-900',
  CANCELLED: 'bg-red-400 text-red-900',
  NO_SHOW: 'bg-gray-400 text-gray-900',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const min = (i % 2) * 30
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
})

type ViewMode = 'day' | 'week' | 'month'

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])

  // Appointment wizard state
  const [showNewApptWizard, setShowNewApptWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardData, setWizardData] = useState({
    staffId: '',
    date: '',
    startTime: '',
    serviceId: '',
    clientId: '',
    notes: '',
  })
  const [creatingAppt, setCreatingAppt] = useState(false)

  // Time block state
  const [showTimeBlockModal, setShowTimeBlockModal] = useState(false)
  const [timeBlockData, setTimeBlockData] = useState({
    staffId: '',
    date: '',
    startTime: '',
    endTime: '',
    reason: '',
  })
  const [creatingTimeBlock, setCreatingTimeBlock] = useState(false)

  // Edit appointment state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({
    staffId: '',
    serviceId: '',
    date: '',
    startTime: '',
    notes: '',
  })
  const [editingAppt, setEditingAppt] = useState(false)

  // Tip input state
  const [tipAmount, setTipAmount] = useState(0)
  const [addingTip, setAddingTip] = useState(false)

  // Client search state
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  useEffect(() => {
    fetchStaff()
    fetchServices()
  }, [])

  useEffect(() => {
    fetchAppointments()
  }, [currentDate, viewMode, selectedStaffId])

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/v1/merchant/salon/staff')
      const result = response.data?.data || response.data
      const staff = Array.isArray(result) ? result : result.staff || []
      setStaffList(staff.filter((s: StaffMember) => s.isActive))
    } catch {
      // silently ignore staff fetch errors
    }
  }

  const fetchServices = async () => {
    try {
      const response = await api.get('/api/v1/merchant/salon/services')
      const result = response.data?.data || response.data
      // API returns categories with nested services — flatten them
      const categories = Array.isArray(result) ? result : result.services || []
      const flat: Service[] = []
      for (const cat of categories) {
        if (cat.services && Array.isArray(cat.services)) {
          for (const svc of cat.services) {
            flat.push({ ...svc, categoryName: cat.name || cat.categoryName })
          }
        } else if (cat.id && cat.name && cat.price !== undefined) {
          // Already a flat service
          flat.push(cat)
        }
      }
      setServices(flat)
    } catch {
      // silently ignore service fetch errors
    }
  }

  const fetchClients = async (search: string) => {
    if (!search.trim()) {
      setClients([])
      return
    }
    try {
      const response = await api.get(
        `/api/v1/merchant/salon/clients?search=${encodeURIComponent(search)}`
      )
      const result = response.data?.data || response.data
      setClients(result.clients || (Array.isArray(result) ? result : []))
    } catch {
      setClients([])
    }
  }

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      let startDate: string
      let endDate: string

      if (viewMode === 'week') {
        const monday = getMonday(currentDate)
        const sunday = new Date(monday)
        sunday.setDate(sunday.getDate() + 6)
        startDate = formatDate(monday)
        endDate = formatDate(sunday)
      } else if (viewMode === 'day') {
        startDate = formatDate(currentDate)
        endDate = formatDate(currentDate)
      } else {
        // month view
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        startDate = formatDate(firstDay)
        endDate = formatDate(lastDay)
      }

      let url = `/api/v1/merchant/salon/appointments?startDate=${startDate}&endDate=${endDate}&limit=1000`
      if (selectedStaffId !== 'all') {
        url += `&staffId=${selectedStaffId}`
      }

      const response = await api.get(url)
      const result = response.data?.data || response.data
      setAppointments(result.appointments || (Array.isArray(result) ? result : []))

      // Also fetch time blocks
      let tbUrl = `/api/v1/merchant/salon/time-blocks?startDate=${startDate}&endDate=${endDate}`
      if (selectedStaffId !== 'all') {
        tbUrl += `&staffId=${selectedStaffId}`
      }
      try {
        const tbResponse = await api.get(tbUrl)
        const tbResult = tbResponse.data?.data || tbResponse.data
        setTimeBlocks(tbResult.timeBlocks || (Array.isArray(tbResult) ? tbResult : []))
      } catch {
        setTimeBlocks([])
      }

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
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  const getStaffName = (staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId)
    return staff ? staff.name || `${staff.firstName} ${staff.lastName}` : ''
  }

  const getServiceName = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    return service?.name || ''
  }

  const navigateBack = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateForward = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
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

  const getMonthDays = (): MonthDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)

    // Calculate Monday-based offset (grid starts on Monday)
    const dayOfWeek = firstDay.getDay() // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - mondayOffset)

    const days: MonthDay[] = []
    const current = new Date(startDate)

    while (days.length < 42) {
      const dateStr = formatDate(current)
      const appts = appointments.filter((a) => a.date === dateStr)
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        appointments: appts,
      })
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = formatDate(date)
    return appointments.filter((apt) => apt.date === dateStr)
  }

  const getTimeBlocksForDay = (date: Date) => {
    const dateStr = formatDate(date)
    return timeBlocks.filter((tb) => tb.date === dateStr)
  }

  const getTimeSlotPosition = (time: string) => {
    const [hours, mins] = time.split(':').map(Number)
    return (hours - 8) * 2 + Math.floor(mins / 30)
  }

  const getAppointmentStyle = (apt: Appointment) => {
    const heightMultiplier = (apt.duration || 30) / 30
    return {
      height: `${heightMultiplier * 64 - 2}px`,
    }
  }

  const getDateRangeLabel = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
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

  const openNewApptWizard = (prefillDate?: string, prefillTime?: string, prefillStaffId?: string) => {
    setWizardData({
      staffId: prefillStaffId || '',
      date: prefillDate || '',
      startTime: prefillTime || '',
      serviceId: '',
      clientId: '',
      notes: '',
    })
    setWizardStep(1)
    setShowNewApptWizard(true)
  }

  const openTimeBlockModal = (date?: string, startTime?: string, staffId?: string) => {
    setTimeBlockData({
      staffId: staffId || '',
      date: date || '',
      startTime: startTime || '',
      endTime: '',
      reason: '',
    })
    setShowTimeBlockModal(true)
  }

  const createAppointment = async () => {
    if (!wizardData.staffId || !wizardData.date || !wizardData.startTime || !wizardData.serviceId || !wizardData.clientId) {
      setError('Please fill in all required fields')
      return
    }

    setCreatingAppt(true)
    try {
      const payload = {
        clientId: wizardData.clientId,
        staffId: wizardData.staffId,
        serviceId: wizardData.serviceId,
        date: wizardData.date,
        startTime: wizardData.startTime,
        notes: wizardData.notes || undefined,
      }
      await api.post('/api/v1/merchant/salon/appointments', payload)
      setShowNewApptWizard(false)
      setWizardData({
        staffId: '',
        date: '',
        startTime: '',
        serviceId: '',
        clientId: '',
        notes: '',
      })
      setWizardStep(1)
      await fetchAppointments()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to create appointment')
      }
    } finally {
      setCreatingAppt(false)
    }
  }

  const createTimeBlock = async () => {
    if (!timeBlockData.staffId || !timeBlockData.date || !timeBlockData.startTime || !timeBlockData.endTime || !timeBlockData.reason) {
      setError('Please fill in all time block fields')
      return
    }

    setCreatingTimeBlock(true)
    try {
      const payload = {
        staffId: timeBlockData.staffId,
        date: timeBlockData.date,
        startTime: timeBlockData.startTime,
        endTime: timeBlockData.endTime,
        reason: timeBlockData.reason,
      }
      await api.post('/api/v1/merchant/salon/time-blocks', payload)
      setShowTimeBlockModal(false)
      setTimeBlockData({
        staffId: '',
        date: '',
        startTime: '',
        endTime: '',
        reason: '',
      })
      await fetchAppointments()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to create time block')
      }
    } finally {
      setCreatingTimeBlock(false)
    }
  }

  const deleteTimeBlock = async (blockId: string) => {
    try {
      await api.delete(`/api/v1/merchant/salon/time-blocks/${blockId}`)
      await fetchAppointments()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete time block')
      }
    }
  }

  const refetchAndSelect = async (apptId: string) => {
    // Build date range based on current view mode
    let startDate: string
    let endDate: string
    if (viewMode === 'week') {
      const monday = getMonday(currentDate)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      startDate = formatDate(monday)
      endDate = formatDate(sunday)
    } else if (viewMode === 'day') {
      startDate = formatDate(currentDate)
      endDate = formatDate(currentDate)
    } else {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      startDate = formatDate(firstDay)
      endDate = formatDate(lastDay)
    }
    let url = `/api/v1/merchant/salon/appointments?startDate=${startDate}&endDate=${endDate}&limit=1000`
    if (selectedStaffId !== 'all') {
      url += `&staffId=${selectedStaffId}`
    }
    const response = await api.get(url)
    const result = response.data?.data || response.data
    const freshAppointments = result.appointments || (Array.isArray(result) ? result : [])
    setAppointments(freshAppointments)
    const updated = freshAppointments.find((a: Appointment) => a.id === apptId)
    if (updated) {
      setSelectedAppt(updated)
    }
  }

  const updateAppointmentStatus = async (apptId: string, status: string) => {
    try {
      const endpoint = status.toLowerCase().replace('_', '-')
      await api.patch(`/api/v1/merchant/salon/appointments/${apptId}/${endpoint}`)
      await refetchAndSelect(apptId)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update appointment')
      }
    }
  }

  const updateAppointment = async () => {
    if (!selectedAppt) return
    if (!editData.staffId || !editData.serviceId || !editData.date || !editData.startTime) {
      setError('Please fill in all required fields')
      return
    }

    setEditingAppt(true)
    try {
      const payload = {
        staffId: editData.staffId,
        serviceId: editData.serviceId,
        date: editData.date,
        startTime: editData.startTime,
        notes: editData.notes || undefined,
      }
      await api.put(`/api/v1/merchant/salon/appointments/${selectedAppt.id}`, payload)
      setShowEditModal(false)
      await fetchAppointments()
      const updated = appointments.find((a) => a.id === selectedAppt.id)
      if (updated) {
        setSelectedAppt(updated)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update appointment')
      }
    } finally {
      setEditingAppt(false)
    }
  }

  const addTip = async () => {
    if (!selectedAppt || tipAmount <= 0) return

    setAddingTip(true)
    try {
      await api.patch(`/api/v1/merchant/salon/appointments/${selectedAppt.id}/tip`, {
        tip: tipAmount,
      })
      setTipAmount(0)
      await refetchAndSelect(selectedAppt.id)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to add tip')
      }
    } finally {
      setAddingTip(false)
    }
  }

  const getAvailableActions = (status: string) => {
    const actions = []
    switch (status) {
      case 'PENDING':
        actions.push('confirm', 'start', 'cancel', 'no-show', 'modify')
        break
      case 'CONFIRMED':
        actions.push('start', 'cancel', 'modify')
        break
      case 'IN_PROGRESS':
        actions.push('complete', 'modify')
        break
      default:
        if (status !== 'COMPLETED') {
          actions.push('modify')
        }
    }
    return actions
  }

  const handleClientSearch = (value: string) => {
    setClientSearch(value)
    if (value.trim()) {
      fetchClients(value)
      setShowClientDropdown(true)
    } else {
      setClients([])
      setShowClientDropdown(false)
    }
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

  return (
    <Layout>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md">
            {error}
          </div>
        )}

        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setViewMode('day')
                  setCurrentDate(new Date())
                }}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  viewMode === 'day'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => {
                  setViewMode('week')
                  setCurrentDate(new Date())
                }}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  viewMode === 'week'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => {
                  setViewMode('month')
                  setCurrentDate(new Date())
                }}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                  viewMode === 'month'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Month
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={navigateBack}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
              >
                ←
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
                →
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

            {/* New Appointment Button */}
            <button
              onClick={() => openNewApptWizard()}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              + New Appointment
            </button>
            <button
              onClick={() => openTimeBlockModal()}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              + Time Block
            </button>
          </div>
        </div>

        {/* Calendar View */}
        {(viewMode === 'day' || viewMode === 'week') && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header with Day Names and Dates */}
                <div className="flex border-b border-gray-200">
                  <div className="w-20 bg-gray-100 border-r border-gray-200 p-4 flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-700">Time</span>
                  </div>
                  {(viewMode === 'week' ? getWeekDates() : [currentDate]).map((date, i) => {
                    const isToday = formatDate(date) === formatDate(new Date())
                    return (
                      <div
                        key={i}
                        className={`flex-1 border-r border-gray-200 p-4 text-center min-w-56 ${
                          isToday ? 'bg-blue-50' : 'bg-gray-50'
                        }`}
                      >
                        <p className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                          {viewMode === 'day'
                            ? currentDate.toLocaleDateString('en-US', { weekday: 'long' })
                            : DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
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
                    {(viewMode === 'week' ? getWeekDates() : [currentDate]).map((date, dayIdx) => {
                      const isToday = formatDate(date) === formatDate(new Date())
                      return (
                        <div
                          key={`${time}-${dayIdx}`}
                          className={`flex-1 border-r border-gray-200 relative min-w-56 cursor-pointer ${
                            isToday ? 'bg-blue-50 bg-opacity-30' : 'bg-white'
                          } hover:bg-gray-50 transition-colors`}
                          onClick={() => openNewApptWizard(formatDate(date), time)}
                        >
                          {/* Time Blocks */}
                          {getTimeBlocksForDay(date).map((block) => {
                            const blockStartIdx = getTimeSlotPosition(block.startTime)
                            if (blockStartIdx === idx) {
                              const blockDuration = Math.round(
                                (new Date(`2000-01-01T${block.endTime}`).getTime() -
                                  new Date(`2000-01-01T${block.startTime}`).getTime()) /
                                  (1000 * 60)
                              )
                              const blockHeightMultiplier = blockDuration / 30
                              return (
                                <div
                                  key={block.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const reason = window.confirm(
                                      `Delete time block: ${block.reason}?\n\nOK to delete, Cancel to keep`
                                    )
                                    if (reason) {
                                      deleteTimeBlock(block.id)
                                    }
                                  }}
                                  className="absolute left-0.5 right-0.5 bg-gray-300 text-gray-700 rounded p-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden border-2 border-dashed border-gray-400"
                                  style={{
                                    height: `${blockHeightMultiplier * 64 - 2}px`,
                                  }}
                                  title={`${block.reason}\n${block.startTime} - ${block.endTime}`}
                                >
                                  <div className="text-xs font-semibold truncate">{block.reason}</div>
                                  <div className="text-xs truncate">{block.staffName}</div>
                                </div>
                              )
                            }
                            return null
                          })}

                          {/* Appointments */}
                          {getAppointmentsForDay(date).map((apt) => {
                            const apptStartIdx = getTimeSlotPosition(apt.startTime)
                            if (apptStartIdx === idx) {
                              const bgColor = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING
                              return (
                                <div
                                  key={apt.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedAppt(apt)
                                  }}
                                  className={`absolute left-0.5 right-0.5 ${bgColor} rounded p-1 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden shadow-md`}
                                  style={getAppointmentStyle(apt)}
                                  title={`${apt.serviceName} - ${apt.clientName}`}
                                >
                                  <div className="text-xs font-semibold truncate">{apt.serviceName}</div>
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
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="border-r border-gray-200 p-4 text-center bg-gray-100 font-semibold text-gray-700 text-sm last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {getMonthDays().map((day, idx) => {
                const isToday = formatDate(day.date) === formatDate(new Date())
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setViewMode('day')
                      setCurrentDate(day.date)
                    }}
                    className={`border-r border-b border-gray-200 p-3 min-h-24 cursor-pointer transition-colors ${
                      day.isCurrentMonth
                        ? isToday
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'bg-white hover:bg-gray-50'
                        : 'bg-gray-50'
                    } last:border-r-0`}
                  >
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        day.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.appointments.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAppt(apt)
                          }}
                          className={`text-xs p-1 rounded truncate cursor-pointer ${
                            STATUS_COLORS[apt.status] || STATUS_COLORS.PENDING
                          }`}
                          title={`${apt.serviceName} - ${apt.clientName}`}
                        >
                          {apt.serviceName}
                        </div>
                      ))}
                      {day.appointments.length > 2 && (
                        <div className="text-xs text-gray-500 px-1">
                          +{day.appointments.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Appointment Wizard Modal */}
      {showNewApptWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            {/* Step 1: Staff & Time */}
            {wizardStep === 1 && (
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Step 1: Select Staff & Time</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member *</label>
                  <select
                    value={wizardData.staffId}
                    onChange={(e) => setWizardData({ ...wizardData, staffId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select staff</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name || `${staff.firstName} ${staff.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={wizardData.date}
                    onChange={(e) => setWizardData({ ...wizardData, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                  <select
                    value={wizardData.startTime}
                    onChange={(e) => setWizardData({ ...wizardData, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewApptWizard(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (wizardData.staffId && wizardData.date && wizardData.startTime) {
                        setWizardStep(2)
                      } else {
                        setError('Please fill in all fields')
                      }
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Service */}
            {wizardStep === 2 && (
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Step 2: Select Service</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service *</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {services.map((svc) => (
                      <div
                        key={svc.id}
                        onClick={() => setWizardData({ ...wizardData, serviceId: svc.id })}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          wizardData.serviceId === svc.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-800">{svc.name}</div>
                            <div className="text-xs text-gray-500">{svc.duration} min</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-800">${svc.price.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (wizardData.serviceId) {
                        setWizardStep(3)
                      } else {
                        setError('Please select a service')
                      }
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Client */}
            {wizardStep === 3 && (
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Step 3: Select Client</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search client by name..."
                      value={clientSearch}
                      onChange={(e) => handleClientSearch(e.target.value)}
                      onFocus={() => setShowClientDropdown(true)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {showClientDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto z-10">
                        {clients.length > 0 ? (
                          clients.map((client) => (
                            <div
                              key={client.id}
                              onClick={() => {
                                setWizardData({ ...wizardData, clientId: client.id })
                                setClientSearch(`${client.firstName} ${client.lastName}`)
                                setShowClientDropdown(false)
                              }}
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-800">
                                {client.firstName} {client.lastName}
                              </div>
                              {client.phone && <div className="text-xs text-gray-500">{client.phone}</div>}
                            </div>
                          ))
                        ) : clientSearch.trim() ? (
                          <div className="p-3 text-sm text-gray-600 text-center">No clients found</div>
                        ) : (
                          <div className="p-3 text-sm text-gray-600 text-center">Type to search</div>
                        )}
                      </div>
                    )}
                  </div>
                  {wizardData.clientId && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                      Selected: {clientSearch || 'Client selected'}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (wizardData.clientId) {
                        setWizardStep(4)
                      } else {
                        setError('Please select a client')
                      }
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {wizardStep === 4 && (
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Step 4: Confirm & Create</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Staff</p>
                    <p className="font-semibold text-gray-800">{getStaffName(wizardData.staffId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Service</p>
                    <p className="font-semibold text-gray-800">{getServiceName(wizardData.serviceId)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Client</p>
                    <p className="font-semibold text-gray-800">{clientSearch}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Date & Time</p>
                    <p className="font-semibold text-gray-800">
                      {wizardData.date} at {wizardData.startTime}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={wizardData.notes}
                    onChange={(e) => setWizardData({ ...wizardData, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any notes..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={createAppointment}
                    disabled={creatingAppt}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {creatingAppt ? 'Creating...' : 'Create Appointment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Block Modal */}
      {showTimeBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Create Time Block</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member *</label>
              <select
                value={timeBlockData.staffId}
                onChange={(e) => setTimeBlockData({ ...timeBlockData, staffId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select staff</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name || `${staff.firstName} ${staff.lastName}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input
                type="date"
                value={timeBlockData.date}
                onChange={(e) => setTimeBlockData({ ...timeBlockData, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                <select
                  value={timeBlockData.startTime}
                  onChange={(e) => setTimeBlockData({ ...timeBlockData, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                <select
                  value={timeBlockData.endTime}
                  onChange={(e) => setTimeBlockData({ ...timeBlockData, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <input
                type="text"
                value={timeBlockData.reason}
                onChange={(e) => setTimeBlockData({ ...timeBlockData, reason: e.target.value })}
                placeholder="e.g., Break, Lunch, Admin time"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowTimeBlockModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTimeBlock}
                disabled={creatingTimeBlock}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {creatingTimeBlock ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && selectedAppt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-800">Modify Appointment</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member *</label>
              <select
                value={editData.staffId}
                onChange={(e) => setEditData({ ...editData, staffId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select staff</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name || `${staff.firstName} ${staff.lastName}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service *</label>
              <select
                value={editData.serviceId}
                onChange={(e) => setEditData({ ...editData, serviceId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select service</option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} - ${svc.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input
                type="date"
                value={editData.date}
                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
              <select
                value={editData.startTime}
                onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select time</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateAppointment}
                disabled={editingAppt}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {editingAppt ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Panel */}
      {selectedAppt && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-40 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <h3 className="text-2xl font-bold text-gray-800">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppt(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Status Badge */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Status</p>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold text-white ${STATUS_COLORS[selectedAppt.status] || STATUS_COLORS.PENDING}`}>
                {STATUS_LABELS[selectedAppt.status] || selectedAppt.status}
              </span>
            </div>

            {/* Client */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Client</p>
              <p className="text-lg font-semibold text-gray-800">{selectedAppt.clientName}</p>
            </div>

            {/* Service */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Service</p>
              <p className="text-lg font-semibold text-gray-800">{selectedAppt.serviceName}</p>
              {selectedAppt.price && (
                <p className="text-sm text-gray-600 mt-1">${selectedAppt.price.toFixed(2)}</p>
              )}
            </div>

            {/* Staff */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Staff Member</p>
              <p className="text-lg font-semibold text-gray-800">{selectedAppt.staffName}</p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Date</p>
                <p className="text-lg font-semibold text-gray-800">{selectedAppt.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Time</p>
                <p className="text-lg font-semibold text-gray-800">{selectedAppt.startTime}</p>
              </div>
            </div>

            {/* Duration */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Duration</p>
              <p className="text-lg font-semibold text-gray-800">{selectedAppt.duration} minutes</p>
            </div>

            {/* Notes */}
            {selectedAppt.notes && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-gray-800">{selectedAppt.notes}</p>
              </div>
            )}

            {/* Tip */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-3">Tip</p>
              {selectedAppt.tip ? (
                <p className="text-lg font-semibold text-gray-800">${selectedAppt.tip.toFixed(2)}</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={addTip}
                    disabled={tipAmount <= 0 || addingTip}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {addingTip ? 'Adding...' : 'Add'}
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-6 space-y-3">
              {getAvailableActions(selectedAppt.status).includes('confirm') && (
                <button
                  onClick={() => updateAppointmentStatus(selectedAppt.id, 'confirm')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Confirm
                </button>
              )}
              {getAvailableActions(selectedAppt.status).includes('start') && (
                <button
                  onClick={() => updateAppointmentStatus(selectedAppt.id, 'checkin')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Start Service
                </button>
              )}
              {getAvailableActions(selectedAppt.status).includes('complete') && (
                <button
                  onClick={() => updateAppointmentStatus(selectedAppt.id, 'complete')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Complete
                </button>
              )}
              {getAvailableActions(selectedAppt.status).includes('cancel') && (
                <button
                  onClick={() => {
                    if (window.confirm('Cancel this appointment?')) {
                      updateAppointmentStatus(selectedAppt.id, 'cancel')
                    }
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
              {getAvailableActions(selectedAppt.status).includes('no-show') && (
                <button
                  onClick={() => {
                    if (window.confirm('Mark as no-show?')) {
                      updateAppointmentStatus(selectedAppt.id, 'no-show')
                    }
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  No Show
                </button>
              )}
              {getAvailableActions(selectedAppt.status).includes('modify') && (
                <button
                  onClick={() => {
                    setEditData({
                      staffId: selectedAppt.staffId,
                      serviceId: selectedAppt.serviceId || '',
                      date: selectedAppt.date,
                      startTime: selectedAppt.startTime,
                      notes: selectedAppt.notes || '',
                    })
                    setShowEditModal(true)
                  }}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Modify
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
