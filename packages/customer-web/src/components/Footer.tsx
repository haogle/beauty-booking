import type { Salon } from '../lib/types'

interface FooterProps {
  salon: Salon | null
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function Footer({ salon }: FooterProps) {
  if (!salon) return null

  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-3">{salon.name}</h3>
          {salon.addressLine1 && (
            <p className="text-sm">
              {salon.addressLine1}
              {salon.addressLine2 && <>, {salon.addressLine2}</>}
              <br />
              {salon.city}, {salon.state} {salon.zipCode}
            </p>
          )}
          {salon.phone && <p className="text-sm mt-2">{salon.phone}</p>}
          {salon.email && <p className="text-sm">{salon.email}</p>}
        </div>

        <div>
          <h3 className="text-white font-bold text-lg mb-3">Hours</h3>
          <div className="text-sm space-y-1">
            {salon.businessHours
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((h) => (
                <div key={h.dayOfWeek} className="flex justify-between">
                  <span>{DAY_NAMES[h.dayOfWeek]}</span>
                  <span>{h.isClosed ? 'Closed' : `${h.openTime} - ${h.closeTime}`}</span>
                </div>
              ))}
          </div>
        </div>

        <div>
          <h3 className="text-white font-bold text-lg mb-3">Quick Links</h3>
          <div className="text-sm space-y-2">
            <a href="/book" className="block hover:text-rose-400 transition-colors">Book an Appointment</a>
            <a href="/#services" className="block hover:text-rose-400 transition-colors">Our Services</a>
            <a href="/#team" className="block hover:text-rose-400 transition-colors">Meet Our Team</a>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
        Powered by Beauty Booking
      </div>
    </footer>
  )
}
