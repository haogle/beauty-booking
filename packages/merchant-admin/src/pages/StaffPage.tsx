import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface WorkHours {
  dayOfWeek: number
  startTime: string
  endTime: string
  isOff: boolean
}

interface StaffMember {
  id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'OWNER' | 'TECHNICIAN' | 'RECEPTIONIST'
  bio?: string
  isActive?: boolean
  services?: string[]
  workHours?: WorkHours[]
}

interface StaffResponse {
  staff?: StaffMember[]
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DEFAULT_WORK_HOURS: WorkHours[] = [
  { dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isOff: false },
  { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isOff: false },
  { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isOff: false },
  { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isOff: false },
  { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isOff: false },
  { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isOff: true },
  { dayOfWeek: 6, startTime: '09:00', endTime: '17:00', isOff: true },
]

const AVATAR_COLORS = [
  '#7C5CFC', // purple
  '#F5A623', // orange
  '#4ECDC4', // teal
  '#FF6B6B', // coral
  '#45B7D1', // blue
  '#96CEB4', // sage
  '#FFEAA7', // yellow
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#FF9FF3', // pink
]

const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

const getInitials = (firstName: string, lastName: string) => {
  const f = firstName || ''
  const l = lastName || ''
  return `${f.charAt(0) || '?'}${l.charAt(0) || '?'}`.toUpperCase()
}

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [allServices, setAllServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'TECHNICIAN' as 'OWNER' | 'TECHNICIAN' | 'RECEPTIONIST',
    bio: '',
  })

  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set())
  const [workHours, setWorkHours] = useState<WorkHours[]>(DEFAULT_WORK_HOURS)

  useEffect(() => {
    fetchStaff()
    fetchServices()
  }, [])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/merchant/salon/staff')
      const result = response.data?.data || response.data
      setStaff(Array.isArray(result) ? result : (result.staff || []))
      setError('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load staff')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await api.get('/api/v1/merchant/salon/services')
      const result = response.data?.data || response.data
      const categories = Array.isArray(result) ? result : (result.categories || [])
      const services = categories.flatMap((cat: any) => cat.services || [])
      setAllServices(services)
    } catch (err) {
      console.error('Failed to load services', err)
    }
  }

  const handleOpenModal = (member?: StaffMember) => {
    if (member && member.id) {
      setEditingStaff(member)
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        bio: member.bio || '',
      })
      setSelectedServices(new Set(member.services || []))
      setWorkHours(member.workHours || DEFAULT_WORK_HOURS)
    } else {
      setEditingStaff(null)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'TECHNICIAN',
        bio: '',
      })
      setSelectedServices(new Set())
      setWorkHours(DEFAULT_WORK_HOURS)
    }
    setShowModal(true)
  }

  const handleAddStaff = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError('All required fields must be filled')
      return
    }

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        bio: formData.bio.trim(),
      }
      await api.post('/api/v1/merchant/salon/staff', payload)
      setSuccess('Staff member added successfully')
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      await fetchStaff()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to add staff member')
      }
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff?.id) return
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError('All required fields must be filled')
      return
    }

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        bio: formData.bio.trim(),
      }
      await api.put(`/api/v1/merchant/salon/staff/${editingStaff.id}`, payload)
      setSuccess('Staff member updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setShowModal(false)
      await fetchStaff()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update staff member')
      }
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    const newActive = !member.isActive
    const action = newActive ? 'activate' : 'deactivate'
    if (!confirm(`Are you sure you want to ${action} ${member.firstName} ${member.lastName}?`)) return
    try {
      await api.put(`/api/v1/merchant/salon/staff/${member.id}`, { isActive: newActive })
      setSuccess(`Staff member ${action}d successfully`)
      setTimeout(() => setSuccess(''), 3000)
      await fetchStaff()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(`Failed to ${action} staff member`)
      }
    }
  }

  const handleSaveServices = async (staffId: string) => {
    try {
      await api.put(`/api/v1/merchant/salon/staff/${staffId}/services`, {
        serviceIds: Array.from(selectedServices),
      })
      setSuccess('Services updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchStaff()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update services')
      }
    }
  }

  const handleSaveWorkHours = async (staffId: string) => {
    try {
      await api.put(`/api/v1/merchant/salon/staff/${staffId}/work-hours`, {
        hours: workHours,
      })
      setSuccess('Work hours updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchStaff()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update work hours')
      }
    }
  }

  const toggleService = (serviceId: string) => {
    const newServices = new Set(selectedServices)
    if (newServices.has(serviceId)) {
      newServices.delete(serviceId)
    } else {
      newServices.add(serviceId)
    }
    setSelectedServices(newServices)
  }

  const updateWorkHours = (dayOfWeek: number, field: string, value: any) => {
    setWorkHours(
      workHours.map((hours) =>
        hours.dayOfWeek === dayOfWeek ? { ...hours, [field]: value } : hours
      )
    )
  }

  const toggleSection = (sectionId: string) => {
    const newSections = new Set(expandedSections)
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId)
    } else {
      newSections.add(sectionId)
    }
    setExpandedSections(newSections)
  }

  const selectedMember = staff.find((m) => m.id === selectedStaffId)

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading staff...</p>
        </div>
      </Layout>
    )
  }

  // Detail View
  if (selectedStaffId && selectedMember) {
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

          <button
            onClick={() => setSelectedStaffId(null)}
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 mb-6"
          >
            ← Back to Team
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel: Staff Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Header */}
              <div className="text-center">
                <div
                  className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(`${selectedMember.firstName} ${selectedMember.lastName}`) }}
                >
                  {getInitials(selectedMember.firstName, selectedMember.lastName)}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedMember.firstName} {selectedMember.lastName}
                </h2>
                <p className="text-gray-600 text-sm mt-1">{selectedMember.role}</p>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full mt-3 inline-block ${
                    selectedMember.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {selectedMember.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Settings Blocks */}
              <div className="space-y-3">
                {/* Work Hours Block */}
                <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <button
                    onClick={() => toggleSection('work-hours')}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-semibold text-gray-800 transition-colors"
                  >
                    Work Hours
                    <span>{expandedSections.has('work-hours') ? '−' : '+'}</span>
                  </button>
                  {expandedSections.has('work-hours') && (
                    <div className="p-4 bg-white space-y-3 border-t border-gray-200">
                      {workHours.map((hours) => (
                        <div key={hours.dayOfWeek} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">{DAYS_OF_WEEK[hours.dayOfWeek]}</span>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hours.isOff}
                                onChange={(e) => updateWorkHours(hours.dayOfWeek, 'isOff', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600"
                              />
                              <span className="ml-2 text-xs text-gray-600">Off</span>
                            </label>
                          </div>
                          {!hours.isOff && (
                            <div className="flex gap-2">
                              <input
                                type="time"
                                value={hours.startTime}
                                onChange={(e) => updateWorkHours(hours.dayOfWeek, 'startTime', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-gray-600 text-xs">to</span>
                              <input
                                type="time"
                                value={hours.endTime}
                                onChange={(e) => updateWorkHours(hours.dayOfWeek, 'endTime', e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => selectedMember.id && handleSaveWorkHours(selectedMember.id)}
                        className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded transition-colors text-sm"
                      >
                        Save Hours
                      </button>
                    </div>
                  )}
                </div>

                {/* Services Block */}
                <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <button
                    onClick={() => toggleSection('services')}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-semibold text-gray-800 transition-colors"
                  >
                    Services
                    <span>{expandedSections.has('services') ? '−' : '+'}</span>
                  </button>
                  {expandedSections.has('services') && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {allServices.length > 0 ? (
                          allServices.map((service) => (
                            <label key={service.id} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedServices.has(service.id)}
                                onChange={() => toggleService(service.id)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{service.name}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No services available</p>
                        )}
                      </div>
                      {allServices.length > 0 && (
                        <button
                          onClick={() => selectedMember.id && handleSaveServices(selectedMember.id)}
                          className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded transition-colors text-sm"
                        >
                          Save Services
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Settings Block */}
                <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <button
                    onClick={() => toggleSection('profile')}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center font-semibold text-gray-800 transition-colors"
                  >
                    Profile Settings
                    <span>{expandedSections.has('profile') ? '−' : '+'}</span>
                  </button>
                  {expandedSections.has('profile') && (
                    <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => selectedMember.id && handleUpdateStaff()}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded transition-colors text-sm"
                      >
                        Update Profile
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => handleOpenModal(selectedMember)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded transition-colors"
                  >
                    Edit Member
                  </button>
                  <button
                    onClick={() => selectedMember.id && handleToggleActive(selectedMember)}
                    className={`w-full font-semibold py-2 rounded transition-colors ${
                      selectedMember.isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {selectedMember.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel: Member Details */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-8">
              <div className="text-center mb-8">
                <div
                  className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(`${selectedMember.firstName} ${selectedMember.lastName}`) }}
                >
                  {getInitials(selectedMember.firstName, selectedMember.lastName)}
                </div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {selectedMember.firstName} {selectedMember.lastName}
                </h1>
                <p className="text-lg text-gray-600 mt-1">{selectedMember.role}</p>
              </div>

              {/* Service Tags */}
              {selectedServices.size > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Assigned Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {allServices
                      .filter((s) => selectedServices.has(s.id))
                      .map((service) => (
                        <span
                          key={service.id}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold"
                        >
                          {service.name}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {selectedMember.bio && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Bio</h3>
                  <p className="text-gray-600 leading-relaxed">{selectedMember.bio}</p>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 mb-3">Contact Information</h3>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 font-semibold">Email:</span>
                  <span className="text-gray-800">{selectedMember.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 font-semibold">Phone:</span>
                  <span className="text-gray-800">{selectedMember.phone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // List View
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

        <h2 className="text-3xl font-bold text-gray-800">Team Members</h2>

        {/* Staff Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {staff.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedStaffId(member.id || null)}
              className="text-center p-6 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer bg-white"
            >
              <div
                className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white"
                style={{ backgroundColor: getAvatarColor(`${member.firstName} ${member.lastName}`) }}
              >
                {getInitials(member.firstName, member.lastName)}
              </div>
              <h3 className="font-semibold text-gray-800 text-sm truncate">
                {member.firstName} {member.lastName}
              </h3>
              <p className="text-xs text-gray-600 mt-1">{member.role}</p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full mt-2 inline-block ${
                  member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {member.isActive ? 'Active' : 'Inactive'}
              </span>
            </button>
          ))}

          {/* Add New Member Card */}
          <button
            onClick={() => handleOpenModal()}
            className="text-center p-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center"
          >
            <span className="text-4xl text-gray-400 mb-2">+</span>
            <p className="font-semibold text-gray-600 text-sm">Add New Member</p>
          </button>
        </div>

        {/* Add/Edit Staff Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 my-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="TECHNICIAN">Technician</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingStaff(null)
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingStaff ? handleUpdateStaff : handleAddStaff}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {editingStaff ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
