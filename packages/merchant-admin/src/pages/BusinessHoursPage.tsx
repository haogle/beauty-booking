import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface DayHours {
  day: string
  isClosed: boolean
  openTime: string
  closeTime: string
}

interface BusinessHours {
  id?: string
  days: DayHours[]
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const BusinessHoursPage: React.FC = () => {
  const [businessHours, setBusinessHours] = useState<BusinessHours>({ days: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchBusinessHours = async () => {
      try {
        setLoading(true)
        const response = await api.get('/api/v1/merchant/salon/business-hours')
        const data = response.data || { days: [] }

        if (!data.days || data.days.length === 0) {
          const defaultDays = DAYS_OF_WEEK.map((day) => ({
            day,
            isClosed: day === 'Sunday',
            openTime: '09:00',
            closeTime: '17:00',
          }))
          setBusinessHours({ ...data, days: defaultDays })
        } else {
          setBusinessHours(data)
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load business hours')
        }

        const defaultDays = DAYS_OF_WEEK.map((day) => ({
          day,
          isClosed: day === 'Sunday',
          openTime: '09:00',
          closeTime: '17:00',
        }))
        setBusinessHours({ days: defaultDays })
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessHours()
  }, [])

  const handleDayChange = (index: number, field: string, value: string | boolean) => {
    setBusinessHours((prev) => {
      const updatedDays = [...prev.days]
      updatedDays[index] = {
        ...updatedDays[index],
        [field]: value,
      }
      return { ...prev, days: updatedDays }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await api.put('/api/v1/merchant/salon/business-hours', businessHours)
      setSuccess('Business hours updated successfully!')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save business hours')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading business hours...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
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

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {businessHours.days.map((day, index) => (
                <div
                  key={day.day}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="w-32 flex-shrink-0">
                    <p className="font-semibold text-gray-700">{day.day}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`closed-${day.day}`}
                      checked={day.isClosed}
                      onChange={(e) => handleDayChange(index, 'isClosed', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor={`closed-${day.day}`} className="text-gray-700">
                      Closed
                    </label>
                  </div>

                  {!day.isClosed && (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor={`open-${day.day}`} className="text-gray-700 font-medium">
                          Open:
                        </label>
                        <input
                          id={`open-${day.day}`}
                          type="time"
                          value={day.openTime}
                          onChange={(e) => handleDayChange(index, 'openTime', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label htmlFor={`close-${day.day}`} className="text-gray-700 font-medium">
                          Close:
                        </label>
                        <input
                          id={`close-${day.day}`}
                          type="time"
                          value={day.closeTime}
                          onChange={(e) => handleDayChange(index, 'closeTime', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Business Hours'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
