import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api, { SALON_SUBDOMAIN } from '../lib/api'
import type { Salon, ServiceCategory, Staff, Service, TimeSlot, ServiceAddon } from '../lib/types'

type BookingStep = 'service' | 'staff' | 'datetime' | 'confirm'

export function BookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [salon, setSalon] = useState<Salon | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  // Booking state
  const [step, setStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableStaffForSlot, setAvailableStaffForSlot] = useState<{ id: string; name: string }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsMessage, setSlotsMessage] = useState('')

  // Client info
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salonRes, servicesRes, staffRes] = await Promise.all([
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/services`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/staff`),
        ])
        setSalon(salonRes.data?.data || salonRes.data)
        const cats = servicesRes.data?.data || servicesRes.data
        setCategories(cats)
        setAllStaff(staffRes.data?.data || staffRes.data)

        // Pre-select service if serviceId in URL
        const preSelectedId = searchParams.get('serviceId')
        if (preSelectedId) {
          for (const cat of cats) {
            const svc = cat.services.find((s: Service) => s.id === preSelectedId)
            if (svc) {
              setSelectedService(svc)
              setStep('staff')
              break
            }
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [searchParams])

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setSelectedDate(tomorrow.toISOString().split('T')[0])
  }, [])

  // Fetch availability when date or staff changes
  useEffect(() => {
    if (step !== 'datetime' || !selectedService || !selectedDate) return

    const fetchSlots = async () => {
      setLoadingSlots(true)
      setSlotsMessage('')
      setSlots([])
      setSelectedTime('')

      try {
        const params: Record<string, string> = {
          date: selectedDate,
          serviceId: selectedService.id,
        }
        if (selectedStaff) {
          params.staffId = selectedStaff.id
        }

        const res = await api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/availability`, { params })
        const data = res.data?.data || res.data
        setSlots(data.slots || [])
        setSlotsMessage(data.message || '')
      } catch (err) {
        console.error('Failed to load availability:', err)
        setSlotsMessage('Failed to load availability')
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlots()
  }, [step, selectedService, selectedDate, selectedStaff])

  const eligibleStaff = selectedService
    ? allStaff.filter((s) => s.serviceIds.includes(selectedService.id))
    : []

  const handleSelectService = (service: Service) => {
    setSelectedService(service)
    setSelectedAddons([])
    setSelectedStaff(null)
    setSelectedTime('')
    setStep('staff')
  }

  const handleSelectStaff = (staff: Staff | null) => {
    setSelectedStaff(staff)
    setSelectedTime('')
    setStep('datetime')
  }

  const handleSelectTime = (time: string, staffOptions: { id: string; name: string }[]) => {
    setSelectedTime(time)
    setAvailableStaffForSlot(staffOptions)

    // If no staff pre-selected, auto-assign first available
    if (!selectedStaff && staffOptions.length > 0) {
      const autoStaff = allStaff.find((s) => s.id === staffOptions[0].id)
      if (autoStaff) {
        setSelectedStaff(autoStaff)
      }
    }
    setStep('confirm')
  }

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId],
    )
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedStaff || !selectedTime || !clientName || !clientPhone) return

    setSubmitting(true)
    setError('')

    try {
      const res = await api.post(`/api/v1/public/salon/${SALON_SUBDOMAIN}/book`, {
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientPhone,
        clientEmail: clientEmail || undefined,
        notes: notes || undefined,
        addons: selectedAddons.length > 0 ? selectedAddons : undefined,
      })

      const result = res.data?.data || res.data
      navigate('/confirmation', { state: { booking: result, salonName: salon?.name } })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Booking failed'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  const totalPrice = selectedService
    ? selectedService.price +
      (selectedService.addons || [])
        .filter((a) => selectedAddons.includes(a.id))
        .reduce((sum, a) => sum + a.price, 0)
    : 0

  const totalDuration = selectedService
    ? selectedService.duration +
      (selectedService.addons || [])
        .filter((a) => selectedAddons.includes(a.id))
        .reduce((sum, a) => sum + a.duration, 0)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    )
  }

  const steps: { key: BookingStep; label: string }[] = [
    { key: 'service', label: 'Service' },
    { key: 'staff', label: 'Staff' },
    { key: 'datetime', label: 'Date & Time' },
    { key: 'confirm', label: 'Confirm' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  // Generate next 14 days for date picker
  const dateOptions: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dateOptions.push(d.toISOString().split('T')[0])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-rose-600">
            {salon?.name || 'Book'}
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <button
                onClick={() => i < currentStepIndex && setStep(s.key)}
                disabled={i > currentStepIndex}
                className={`flex items-center gap-2 ${
                  i <= currentStepIndex ? 'text-rose-600' : 'text-gray-400'
                } ${i < currentStepIndex ? 'cursor-pointer hover:text-rose-700' : ''}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < currentStepIndex
                      ? 'bg-rose-600 text-white'
                      : i === currentStepIndex
                        ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-600'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < currentStepIndex ? '✓' : i + 1}
                </span>
                <span className="text-sm font-medium hidden sm:block">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-2 ${
                    i < currentStepIndex ? 'bg-rose-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Service */}
        {step === 'service' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose a Service</h2>
            {categories.map((cat) => (
              <div key={cat.id} className="mb-8">
                <h3 className="text-lg font-semibold text-rose-600 mb-3">{cat.name}</h3>
                <div className="space-y-2">
                  {cat.services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedService?.id === service.id
                          ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500'
                          : 'border-gray-200 bg-white hover:border-rose-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-gray-900">{service.name}</span>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                          )}
                          <span className="text-xs text-gray-400 mt-1 inline-block">{service.duration} min</span>
                        </div>
                        <span className="text-rose-600 font-bold text-lg">${service.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 'staff' && selectedService && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Stylist</h2>
            <p className="text-gray-500 mb-6">For: {selectedService.name} (${selectedService.price})</p>

            {/* Add-ons */}
            {selectedService.addons && selectedService.addons.length > 0 && (
              <div className="mb-8 p-4 bg-white rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Add-ons (optional)</h3>
                <div className="space-y-2">
                  {selectedService.addons.map((addon) => (
                    <label
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedAddons.includes(addon.id)
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-gray-100 hover:border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedAddons.includes(addon.id)}
                          onChange={() => toggleAddon(addon.id)}
                          className="w-4 h-4 text-rose-600 rounded"
                        />
                        <div>
                          <span className="font-medium text-gray-900">{addon.name}</span>
                          <span className="text-xs text-gray-400 ml-2">+{addon.duration} min</span>
                        </div>
                      </div>
                      <span className="text-rose-600 font-semibold">+${addon.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Any available staff option */}
            <button
              onClick={() => handleSelectStaff(null)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-rose-300 hover:shadow-sm transition-all mb-3"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl">
                  ?
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Any Available</span>
                  <p className="text-sm text-gray-500">We'll match you with the first available stylist</p>
                </div>
              </div>
            </button>

            {eligibleStaff.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelectStaff(member)}
                className={`w-full text-left p-4 rounded-xl border transition-all mb-3 ${
                  selectedStaff?.id === member.id
                    ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500'
                    : 'border-gray-200 bg-white hover:border-rose-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-300 to-purple-300 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {member.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{member.name}</span>
                    {member.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{member.bio}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 'datetime' && selectedService && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pick a Date & Time</h2>
            <p className="text-gray-500 mb-6">
              {selectedService.name} {selectedStaff ? `with ${selectedStaff.name}` : '(any available)'}
            </p>

            {/* Date Picker */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {dateOptions.map((date) => {
                  const d = new Date(date + 'T12:00:00')
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                  const dayNum = d.getDate()
                  const monthName = d.toLocaleDateString('en-US', { month: 'short' })

                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center px-4 py-3 rounded-xl border min-w-[72px] transition-all ${
                        selectedDate === date
                          ? 'border-rose-500 bg-rose-50 text-rose-600'
                          : 'border-gray-200 bg-white hover:border-rose-300 text-gray-700'
                      }`}
                    >
                      <span className="text-xs font-medium">{dayName}</span>
                      <span className="text-lg font-bold">{dayNum}</span>
                      <span className="text-xs">{monthName}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              {loadingSlots ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Loading available times...</p>
                </div>
              ) : slotsMessage ? (
                <p className="text-center py-8 text-gray-500">{slotsMessage}</p>
              ) : slots.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No available times for this date</p>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">{slots.length} time slots available</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleSelectTime(slot.time, slot.staff)}
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                          selectedTime === slot.time
                            ? 'border-rose-500 bg-rose-600 text-white'
                            : 'border-gray-200 bg-white hover:border-rose-300 text-gray-700'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Confirm & Book */}
        {step === 'confirm' && selectedService && selectedTime && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Your Booking</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Booking Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                {selectedAddons.length > 0 && selectedService.addons && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Add-ons</span>
                    <span className="font-medium">
                      {selectedService.addons
                        .filter((a) => selectedAddons.includes(a.id))
                        .map((a) => a.name)
                        .join(', ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Stylist</span>
                  <span className="font-medium">{selectedStaff?.name || 'Any available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">{totalDuration} min</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-rose-600 text-lg">${totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Client Info Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !clientName || !clientPhone}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 text-white py-4 rounded-xl text-lg font-semibold transition-colors"
            >
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
