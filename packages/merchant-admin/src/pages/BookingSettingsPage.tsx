import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface BookingSettings {
  bufferMinutes?: number
  minAdvanceMinutes?: number
  allowMultiService?: boolean
  allowMultiPerson?: boolean
  smsVerification?: boolean
  assignmentStrategy?: string
  allowGenderFilter?: boolean
}

export const BookingSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BookingSettings>({
    bufferMinutes: 0,
    minAdvanceMinutes: 60,
    allowMultiService: false,
    allowMultiPerson: false,
    smsVerification: false,
    assignmentStrategy: 'COUNT',
    allowGenderFilter: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const response = await api.get('/api/v1/merchant/salon/booking-settings')
        const result = response.data?.data?.data || response.data?.data || response.data
        if (result) {
          setSettings((prev) => ({
            bufferMinutes: result.bufferMinutes ?? prev.bufferMinutes,
            minAdvanceMinutes: result.minAdvanceMinutes ?? prev.minAdvanceMinutes,
            allowMultiService: result.allowMultiService ?? prev.allowMultiService,
            allowMultiPerson: result.allowMultiPerson ?? prev.allowMultiPerson,
            smsVerification: result.smsVerification ?? prev.smsVerification,
            assignmentStrategy: result.assignmentStrategy ?? prev.assignmentStrategy,
            allowGenderFilter: result.allowGenderFilter ?? prev.allowGenderFilter,
          }))
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load booking settings')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target
    const value =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : isNaN(Number(e.target.value))
          ? e.target.value
          : Number(e.target.value)
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      // Only send DTO-accepted fields
      const updateData: BookingSettings = {
        bufferMinutes: settings.bufferMinutes,
        minAdvanceMinutes: settings.minAdvanceMinutes,
        allowMultiService: settings.allowMultiService,
        allowMultiPerson: settings.allowMultiPerson,
        smsVerification: settings.smsVerification,
        assignmentStrategy: settings.assignmentStrategy,
        allowGenderFilter: settings.allowGenderFilter,
      }
      await api.put('/api/v1/merchant/salon/booking-settings', updateData)
      setSuccess('Booking settings updated successfully!')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save booking settings')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading booking settings...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Buffer & Advance Settings */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Scheduling Settings</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="bufferMinutes" className="block text-gray-700 font-semibold mb-2">
                    Buffer Time Between Bookings (minutes)
                  </label>
                  <input
                    id="bufferMinutes"
                    type="number"
                    name="bufferMinutes"
                    value={settings.bufferMinutes || 0}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum time required between consecutive bookings
                  </p>
                </div>

                <div>
                  <label htmlFor="minAdvanceMinutes" className="block text-gray-700 font-semibold mb-2">
                    Minimum Advance Booking (minutes)
                  </label>
                  <input
                    id="minAdvanceMinutes"
                    type="number"
                    name="minAdvanceMinutes"
                    value={settings.minAdvanceMinutes || 60}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Customers must book at least this many minutes in advance
                  </p>
                </div>
              </div>
            </div>

            {/* Service Options */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Service Options</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    id="allowMultiService"
                    type="checkbox"
                    name="allowMultiService"
                    checked={settings.allowMultiService || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="allowMultiService" className="text-gray-700 font-semibold">
                    Allow Multiple Services per Booking
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="allowMultiPerson"
                    type="checkbox"
                    name="allowMultiPerson"
                    checked={settings.allowMultiPerson || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="allowMultiPerson" className="text-gray-700 font-semibold">
                    Allow Multiple People per Booking
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="allowGenderFilter"
                    type="checkbox"
                    name="allowGenderFilter"
                    checked={settings.allowGenderFilter || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="allowGenderFilter" className="text-gray-700 font-semibold">
                    Allow Gender Filter for Staff
                  </label>
                </div>
              </div>
            </div>

            {/* Verification & Assignment */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Verification & Assignment</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    id="smsVerification"
                    type="checkbox"
                    name="smsVerification"
                    checked={settings.smsVerification || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="smsVerification" className="text-gray-700 font-semibold">
                    Require SMS Verification
                  </label>
                </div>

                <div>
                  <label htmlFor="assignmentStrategy" className="block text-gray-700 font-semibold mb-2">
                    Staff Assignment Strategy
                  </label>
                  <select
                    id="assignmentStrategy"
                    name="assignmentStrategy"
                    value={settings.assignmentStrategy || 'COUNT'}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="COUNT">By Booking Count (even distribution)</option>
                    <option value="RANDOM">Random</option>
                    <option value="MANUAL">Manual Only</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    How staff are automatically assigned to bookings
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Booking Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
