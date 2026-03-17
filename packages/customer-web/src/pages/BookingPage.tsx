import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api, { SALON_SUBDOMAIN, unwrap } from '../lib/api'
import type { Salon, ServiceCategory, Staff, Service, TimeSlot, ServiceAddon } from '../lib/types'

type BookingStep = 'service' | 'addons' | 'staff' | 'datetime' | 'info' | 'confirm'

const STEP_CONFIG: { key: BookingStep; label: string; num: number }[] = [
  { key: 'service', label: 'Service', num: 1 },
  { key: 'addons', label: 'Add-ons', num: 2 },
  { key: 'staff', label: 'Technician', num: 3 },
  { key: 'datetime', label: 'Date & Time', num: 4 },
  { key: 'info', label: 'Your Info', num: 5 },
  { key: 'confirm', label: 'Confirm', num: 6 },
]

export function BookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Data
  const [salon, setSalon] = useState<Salon | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  // Booking state
  const [step, setStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [genderFilter, setGenderFilter] = useState<string>('') // '', 'FEMALE', 'MALE'
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState('')
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

  // Computed values
  const totalPrice = useMemo(() => {
    if (!selectedService) return 0
    const addonPrice = (selectedService.addons || [])
      .filter(a => selectedAddons.includes(a.id))
      .reduce((sum, a) => sum + a.price, 0)
    return selectedService.price + addonPrice
  }, [selectedService, selectedAddons])

  const totalDuration = useMemo(() => {
    if (!selectedService) return 0
    const addonDuration = (selectedService.addons || [])
      .filter(a => selectedAddons.includes(a.id))
      .reduce((sum, a) => sum + a.duration, 0)
    return selectedService.duration + addonDuration
  }, [selectedService, selectedAddons])

  const selectedAddonDetails = useMemo(() => {
    if (!selectedService) return []
    return (selectedService.addons || []).filter(a => selectedAddons.includes(a.id))
  }, [selectedService, selectedAddons])

  const eligibleStaff = useMemo(() => {
    if (!selectedService) return []
    let filtered = allStaff.filter(s => s.serviceIds.includes(selectedService.id))
    if (genderFilter) {
      filtered = filtered.filter(s => s.gender === genderFilter)
    }
    return filtered
  }, [selectedService, allStaff, genderFilter])

  const hasAddons = selectedService && selectedService.addons && selectedService.addons.length > 0
  const allowGenderFilter = salon?.bookingSettings?.allowGenderFilter ?? false

  // Steps to show (skip addons if service has none)
  const visibleSteps = useMemo(() => {
    if (!hasAddons) {
      return STEP_CONFIG.filter(s => s.key !== 'addons')
    }
    return STEP_CONFIG
  }, [hasAddons])

  const currentStepIndex = visibleSteps.findIndex(s => s.key === step)

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salonRes, servicesRes, staffRes] = await Promise.all([
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/services`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/staff`),
        ])
        setSalon(unwrap(salonRes))
        const cats = unwrap(servicesRes)
        setCategories(cats)
        setAllStaff(unwrap(staffRes))

        // Pre-select service if serviceId in URL
        const preSelectedId = searchParams.get('serviceId')
        if (preSelectedId) {
          for (const cat of cats) {
            const svc = cat.services.find((s: Service) => s.id === preSelectedId)
            if (svc) {
              setSelectedService(svc)
              setStep(svc.addons?.length > 0 ? 'addons' : 'staff')
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

  // Default date = tomorrow
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setSelectedDate(tomorrow.toISOString().split('T')[0])
  }, [])

  // Fetch availability
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
        if (selectedStaff) params.staffId = selectedStaff.id
        if (genderFilter) params.gender = genderFilter
        if (totalDuration > selectedService.duration) {
          params.totalDuration = String(totalDuration)
        }

        const res = await api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/availability`, { params })
        const data = unwrap(res)
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
  }, [step, selectedService, selectedDate, selectedStaff, genderFilter, totalDuration])

  // ─── Handlers ───

  const handleSelectService = (service: Service) => {
    setSelectedService(service)
    setSelectedAddons([])
    setSelectedStaff(null)
    setGenderFilter('')
    setSelectedTime('')
    setStep(service.addons?.length > 0 ? 'addons' : 'staff')
  }

  const handleAddonsNext = () => {
    setStep('staff')
  }

  const handleSelectStaff = (staff: Staff | null) => {
    setSelectedStaff(staff)
    setSelectedTime('')
    setStep('datetime')
  }

  const handleSelectTime = (time: string, staffOptions: { id: string; name: string }[]) => {
    setSelectedTime(time)
    // If no staff pre-selected, auto-assign based on booking strategy
    if (!selectedStaff && staffOptions.length > 0) {
      const autoStaff = allStaff.find(s => s.id === staffOptions[0].id)
      if (autoStaff) setSelectedStaff(autoStaff)
    }
    setStep('info')
  }

  const handleInfoNext = () => {
    if (!clientName.trim() || !clientPhone.trim()) return
    setStep('confirm')
  }

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId],
    )
  }

  const goToStep = (targetStep: BookingStep) => {
    const targetIdx = visibleSteps.findIndex(s => s.key === targetStep)
    if (targetIdx < currentStepIndex) {
      setStep(targetStep)
    }
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
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        addons: selectedAddons.length > 0 ? selectedAddons : undefined,
      })

      const result = unwrap(res)
      navigate('/confirmation', { state: { booking: result, salonName: salon?.name } })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Booking failed'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Date Options ───
  const dateOptions: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dateOptions.push(d.toISOString().split('T')[0])
  }

  // ─── Render ───

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-rose-600">
            {salon?.name || 'Book'}
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {visibleSteps.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => goToStep(s.key)}
                  disabled={i >= currentStepIndex}
                  className={`flex items-center gap-1.5 ${
                    i < currentStepIndex ? 'cursor-pointer' : ''
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i < currentStepIndex
                        ? 'bg-rose-600 text-white'
                        : i === currentStepIndex
                          ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-500'
                          : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {i < currentStepIndex ? '✓' : i + 1}
                  </span>
                  <span className={`text-xs font-medium hidden md:block ${
                    i <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </button>
                {i < visibleSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    i < currentStepIndex ? 'bg-rose-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* ─── STEP 1: Select Service ─── */}
        {step === 'service' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Service</h2>
            <p className="text-gray-500 mb-6">Select the service you'd like to book</p>

            {categories.map(cat => (
              <div key={cat.id} className="mb-8">
                <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-3">
                  {cat.name}
                </h3>
                <div className="space-y-2">
                  {cat.services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-rose-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                              {service.name}
                            </span>
                            {service.techCount > 1 && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                {service.techCount} technicians
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <ClockIcon /> {service.duration} min
                            </span>
                            {service.addons.length > 0 && (
                              <span className="text-xs text-gray-400">
                                {service.addons.length} add-on{service.addons.length > 1 ? 's' : ''} available
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-rose-600 font-bold text-lg ml-4">${service.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── STEP 2: Add-ons ─── */}
        {step === 'addons' && selectedService && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enhance Your Experience</h2>
            <p className="text-gray-500 mb-6">
              Add extras to your {selectedService.name} ({selectedService.duration} min, ${selectedService.price})
            </p>

            <div className="space-y-3 mb-8">
              {(selectedService.addons || []).map(addon => {
                const isSelected = selectedAddons.includes(addon.id)
                return (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500'
                        : 'border-gray-200 bg-white hover:border-rose-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-rose-600 border-rose-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{addon.name}</span>
                          <span className="text-xs text-gray-400 ml-2">+{addon.duration} min</span>
                        </div>
                      </div>
                      <span className="text-rose-600 font-semibold">+${addon.price}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Running total */}
            <div className="bg-gray-100 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Duration</span>
                <span>{totalDuration} min</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span className="text-rose-600">${totalPrice}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('service')}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAddonsNext}
                className="flex-[2] py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
              >
                {selectedAddons.length > 0 ? `Continue with ${selectedAddons.length} add-on${selectedAddons.length > 1 ? 's' : ''}` : 'Skip Add-ons'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Select Technician ─── */}
        {step === 'staff' && selectedService && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Technician</h2>
            <p className="text-gray-500 mb-6">
              For: {selectedService.name}
              {selectedAddonDetails.length > 0 && ` + ${selectedAddonDetails.length} add-on${selectedAddonDetails.length > 1 ? 's' : ''}`}
              {' '}— {totalDuration} min, ${totalPrice}
            </p>

            {/* Gender Filter */}
            {allowGenderFilter && (
              <div className="flex gap-2 mb-6">
                {[
                  { value: '', label: 'All' },
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'MALE', label: 'Male' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGenderFilter(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      genderFilter === opt.value
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-rose-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Any Available */}
            <button
              onClick={() => handleSelectStaff(null)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-rose-300 hover:shadow-sm transition-all mb-3"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 text-2xl shrink-0">
                  ✦
                </div>
                <div>
                  <span className="font-semibold text-gray-900">
                    {genderFilter === 'FEMALE' ? 'Any Female Technician' :
                     genderFilter === 'MALE' ? 'Any Male Technician' :
                     'Any Available Technician'}
                  </span>
                  <p className="text-sm text-gray-500">We'll find the best match for your schedule</p>
                </div>
              </div>
            </button>

            {/* Staff List */}
            {eligibleStaff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No technicians available for this service
                {genderFilter && '. Try removing the gender filter.'}
              </div>
            ) : (
              <div className="space-y-3">
                {eligibleStaff.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectStaff(member)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-rose-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-300 to-purple-300 flex items-center justify-center text-white text-lg font-bold shrink-0">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          member.name.split(' ').map(n => n[0]).join('')
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{member.name}</span>
                          {member.gender && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              member.gender === 'FEMALE' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {member.gender === 'FEMALE' ? '♀' : '♂'}
                            </span>
                          )}
                        </div>
                        {member.bio && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{member.bio}</p>}
                      </div>
                      <ChevronRight />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => setStep(hasAddons ? 'addons' : 'service')}
              className="mt-6 w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {/* ─── STEP 4: Date & Time ─── */}
        {step === 'datetime' && selectedService && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pick a Date & Time</h2>
            <p className="text-gray-500 mb-6">
              {selectedService.name}
              {selectedStaff ? ` with ${selectedStaff.name}` : ' (any available)'}
              {' '}— {totalDuration} min
            </p>

            {/* Date Picker */}
            <div className="mb-6 overflow-x-auto -mx-4 px-4">
              <div className="flex gap-2 pb-2">
                {dateOptions.map(date => {
                  const d = new Date(date + 'T12:00:00')
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                  const dayNum = d.getDate()
                  const monthName = d.toLocaleDateString('en-US', { month: 'short' })
                  const isToday = date === new Date().toISOString().split('T')[0]

                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center px-3 py-2.5 rounded-xl border min-w-[68px] transition-all ${
                        selectedDate === date
                          ? 'border-rose-500 bg-rose-50 text-rose-600'
                          : 'border-gray-200 bg-white hover:border-rose-300 text-gray-700'
                      }`}
                    >
                      <span className="text-xs font-medium">{dayName}</span>
                      <span className="text-lg font-bold">{dayNum}</span>
                      <span className="text-xs">{isToday ? 'Today' : monthName}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              {loadingSlots ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Loading available times...</p>
                </div>
              ) : slotsMessage ? (
                <p className="text-center py-10 text-gray-500">{slotsMessage}</p>
              ) : slots.length === 0 ? (
                <p className="text-center py-10 text-gray-500">No available times for this date</p>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">{slots.length} time{slots.length !== 1 ? 's' : ''} available</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => handleSelectTime(slot.time, slot.staff)}
                        className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                          selectedTime === slot.time
                            ? 'border-rose-500 bg-rose-600 text-white'
                            : 'border-gray-200 bg-white hover:border-rose-300 text-gray-700 hover:bg-rose-50'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Back button */}
            <button
              onClick={() => setStep('staff')}
              className="mt-6 w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {/* ─── STEP 5: Client Info ─── */}
        {step === 'info' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Information</h2>
            <p className="text-gray-500 mb-6">Please provide your contact details</p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (optional)</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special requests..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none text-base"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('datetime')}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleInfoNext}
                disabled={!clientName.trim() || !clientPhone.trim()}
                className="flex-[2] py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Review Booking
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 6: Confirm ─── */}
        {step === 'confirm' && selectedService && selectedTime && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Confirm</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Booking Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              {/* Service */}
              <div className="p-5 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Service</div>
                <div className="flex justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">{selectedService.name}</span>
                    <span className="text-sm text-gray-500 ml-2">{selectedService.duration} min</span>
                  </div>
                  <span className="font-medium text-gray-900">${selectedService.price}</span>
                </div>
                {selectedAddonDetails.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedAddonDetails.map(addon => (
                      <div key={addon.id} className="flex justify-between text-sm text-gray-600">
                        <span className="flex items-center gap-1">+ {addon.name} <span className="text-gray-400">({addon.duration} min)</span></span>
                        <span>+${addon.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technician */}
              <div className="p-5 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Technician</div>
                <span className="font-medium text-gray-900">{selectedStaff?.name || 'Any available'}</span>
              </div>

              {/* Date & Time */}
              <div className="p-5 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date & Time</div>
                <div className="font-medium text-gray-900">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-gray-600">{selectedTime} — {totalDuration} min</div>
              </div>

              {/* Contact */}
              <div className="p-5 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</div>
                <div className="text-gray-900">{clientName}</div>
                <div className="text-gray-600 text-sm">{clientPhone}</div>
                {clientEmail && <div className="text-gray-600 text-sm">{clientEmail}</div>}
                {notes && <div className="text-gray-500 text-sm mt-1 italic">"{notes}"</div>}
              </div>

              {/* Total */}
              <div className="p-5 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-rose-600">${totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="flex-1 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] py-3.5 rounded-xl bg-rose-600 text-white font-bold text-lg hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Booking...
                  </span>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              By confirming, you agree to the salon's booking policy. Your appointment will be pending until confirmed by the salon.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Icons ───

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
