import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface BookingSettings {
  id?: string
  minAdvanceBookingDays?: number
  maxAdvanceBookingDays?: number
  minCancellationHours?: number
  minRescheduleHours?: number
  allowOnlineCancellation?: boolean
  allowOnlineReschedule?: boolean
  requirePhoneVerification?: boolean
  enableAutoConfirmation?: boolean
  bufferTimeBetweenBookings?: number
}

export const BookingSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<BookingSettings>({
    minAdvanceBookingDays: 0,
    maxAdvanceBookingDays: 30,
    minCancellationHours: 24,
    minRescheduleHours: 24,
    allowOnlineCancellation: true,
    allowOnlineReschedule: true,
    requirePhoneVerification: false,
    enableAutoConfirmation: false,
    bufferTimeBetweenBookings: 0,
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
        setSettings((prev) => ({
          ...prev,
          ...response.data,
        }))
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : isNaN(Number(value)) ? value : Number(value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await api.put('/api/v1/merchant/salon/booking-settings', settings)
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
            {/* Advance Booking Settings */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Advance Booking Settings</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="minAdvanceBookingDays" className="block text-gray-700 font-semibold mb-2">
                    Minimum Advance Booking (days)
                  </label>
                  <input
                    id="minAdvanceBookingDays"
                    type="number"
                    name="minAdvanceBookingDays"
                    value={settings.minAdvanceBookingDays || 0}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Customers must book at least this many days in advance
                  </p>
                </div>

                <div>
                  <label htmlFor="maxAdvanceBookingDays" className="block text-gray-700 font-semibold mb-2">
                    Maximum Advance Booking (days)
                  </label>
                  <input
                    id="maxAdvanceBookingDays"
                    type="number"
                    name="maxAdvanceBookingDays"
                    value={settings.maxAdvanceBookingDays || 30}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Customers cannot book more than this many days in advance
                  </p>
                </div>
              </div>
            </div>

            {/* Cancellation & Reschedule Settings */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Cancellation & Reschedule Settings</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="minCancellationHours" className="block text-gray-700 font-semibold mb-2">
                    Minimum Cancellation Notice (hours)
                  </label>
                  <input
                    id="minCancellationHours"
                    type="number"
                    name="minCancellationHours"
                    value={settings.minCancellationHours || 24}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Customers must cancel at least this many hours before the appointment
                  </p>
                </div>

                <div>
                  <label htmlFor="minRescheduleHours" className="block text-gray-700 font-semibold mb-2">
                    Minimum Reschedule Notice (hours)
                  </label>
                  <input
                    id="minRescheduleHours"
                    type="number"
                    name="minRescheduleHours"
                    value={settings.minRescheduleHours || 24}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Customers must reschedule at least this many hours before the appointment
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    id="allowOnlineCancellation"
                    type="checkbox"
                    name="allowOnlineCancellation"
                    checked={settings.allowOnlineCancellation || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="allowOnlineCancellation" className="text-gray-700 font-semibold">
                    Allow Online Cancellation
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="allowOnlineReschedule"
                    type="checkbox"
                    name="allowOnlineReschedule"
                    checked={settings.allowOnlineReschedule || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="allowOnlineReschedule" className="text-gray-700 font-semibold">
                    Allow Online Reschedule
                  </label>
                </div>
              </div>
            </div>

            {/* Verification & Confirmation Settings */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Verification & Confirmation</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    id="requirePhoneVerification"
                    type="checkbox"
                    name="requirePhoneVerification"
                    checked={settings.requirePhoneVerification || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="requirePhoneVerification" className="text-gray-700 font-semibold">
                    Require Phone Verification
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="enableAutoConfirmation"
                    type="checkbox"
                    name="enableAutoConfirmation"
                    checked={settings.enableAutoConfirmation || false}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="enableAutoConfirmation" className="text-gray-700 font-semibold">
                    Enable Auto Confirmation
                  </label>
                </div>
              </div>
            </div>

            {/* Buffer Time Settings */}
            <div className="pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Buffer Time</h3>

              <div>
                <label htmlFor="bufferTimeBetweenBookings" className="block text-gray-700 font-semibold mb-2">
                  Buffer Time Between Bookings (minutes)
                </label>
                <input
                  id="bufferTimeBetweenBookings"
                  type="number"
                  name="bufferTimeBetweenBookings"
                  value={settings.bufferTimeBetweenBookings || 0}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Minimum time required between consecutive bookings
                </p>
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
