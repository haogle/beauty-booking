export interface Salon {
  id: string
  name: string
  phone: string
  email: string
  logoUrl: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string
  subdomain: string
  timezone: string
  businessHours: BusinessHour[]
  bookingSettings: BookingSettings | null
}

export interface BusinessHour {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

export interface BookingSettings {
  bufferMinutes: number
  minAdvanceMinutes: number
  allowMultiService: boolean
  allowMultiPerson: boolean
  allowGenderFilter: boolean
}

export interface ServiceCategory {
  id: string
  name: string
  services: Service[]
}

export interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration: number
  coverImageUrl: string | null
  addons: ServiceAddon[]
}

export interface ServiceAddon {
  id: string
  name: string
  price: number
  duration: number
}

export interface Staff {
  id: string
  name: string
  gender: string | null
  avatarUrl: string | null
  bio: string | null
  role: string
  serviceIds: string[]
}

export interface TimeSlot {
  time: string
  staff: { id: string; name: string }[]
}

export interface AvailabilityResponse {
  date: string
  slots: TimeSlot[]
  message?: string
}

export interface BookingResult {
  appointmentId: string
  status: string
  date: string
  startTime: string
  endTime: string
  service: { name: string; price: number; duration: number }
  addons: ServiceAddon[]
  staff: { id: string; name: string }
  totalPrice: number
  totalDuration: number
}
