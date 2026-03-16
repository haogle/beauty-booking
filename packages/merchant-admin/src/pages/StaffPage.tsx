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
  active?: boolean
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

export const StaffPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [allServices, setAllServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null)

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

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/staff/${id}`)
      setSuccess('Staff member deactivated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchStaff()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to deactivate staff member')
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

  const getInitials = (firstName: string, lastName: string) => {
    const f = firstName || ''
    const l = lastName || ''
    return `${f.charAt(0) || '?'}${l.charAt(0) || '?'}`.toUpperCase()
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading staff...</p>
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

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Add Staff Member
          </button>
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => (
            <div key={member.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div
                    className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold mr-4"
                  >
                    {getInitials(member.firstName, member.lastName)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {member.firstName} {member.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{member.role}</p>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded mt-1 inline-block ${
                        member.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>
                    <span className="font-semibold">Email:</span> {member.email}
                  </p>
                  <p>
                    <span className="font-semibold">Phone:</span> {member.phone}
                  </p>
                  {member.bio && (
                    <p>
                      <span className="font-semibold">Bio:</span> {member.bio}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <button
                    onClick={() => handleOpenModal(member)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setExpandedStaffId(expandedStaffId === member.id ? null : (member.id || null))}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    {expandedStaffId === member.id ? 'Hide Details' : 'Services & Hours'}
                  </button>
                  <button
                    onClick={() => member.id && handleDeleteStaff(member.id)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    Deactivate
                  </button>
                </div>
              </div>

              {/* Expanded Section */}
              {expandedStaffId === member.id && member.id && (
                <div className="bg-gray-50 border-t border-gray-200 p-6 space-y-6">
                  {/* Services Assignment */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Assigned Services</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allServices.length > 0 ? (
                        allServices.map((service) => (
                          <label key={service.id} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedServices.has(service.id)}
                              onChange={() => {
                                toggleService(service.id)
                              }}
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
                        onClick={() => member.id && handleSaveServices(member.id)}
                        className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        Save Services
                      </button>
                    )}
                  </div>

                  {/* Work Hours */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Work Hours</h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {workHours.map((hours) => (
                        <div key={hours.dayOfWeek} className="bg-white p-3 rounded border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-sm text-gray-700">
                              {DAYS_OF_WEEK[hours.dayOfWeek]}
                            </span>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hours.isOff}
                                onChange={(e) =>
                                  updateWorkHours(hours.dayOfWeek, 'isOff', e.target.checked)
                                }
                                className="w-4 h-4 rounded border-gray-300 text-blue-600"
                              />
                              <span className="ml-2 text-xs text-gray-600">Day Off</span>
                            </label>
                          </div>
                          {!hours.isOff && (
                            <div className="flex gap-2">
                              <input
                                type="time"
                                value={hours.startTime}
                                onChange={(e) =>
                                  updateWorkHours(hours.dayOfWeek, 'startTime', e.target.value)
                                }
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-gray-600 text-sm">to</span>
                              <input
                                type="time"
                                value={hours.endTime}
                                onChange={(e) =>
                                  updateWorkHours(hours.dayOfWeek, 'endTime', e.target.value)
                                }
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => member.id && handleSaveWorkHours(member.id)}
                      className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Save Work Hours
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
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
