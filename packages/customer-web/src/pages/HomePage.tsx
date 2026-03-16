import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { SALON_SUBDOMAIN, unwrap } from '../lib/api'
import type { Salon, ServiceCategory, Staff } from '../lib/types'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'

export function HomePage() {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salonRes, servicesRes, staffRes] = await Promise.all([
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/services`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/staff`),
        ])
        setSalon(unwrap(salonRes))
        setCategories(unwrap(servicesRes))
        setStaff(unwrap(staffRes))
      } catch (err) {
        console.error('Failed to load salon data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <p className="text-gray-500">Salon not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header salonName={salon.name} phone={salon.phone} />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-rose-600">{salon.name}</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience premium beauty services in a relaxing atmosphere.
            Book your appointment online in just a few clicks.
          </p>
          <Link
            to="/book"
            className="inline-block bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            Book Your Appointment
          </Link>
          {salon.addressLine1 && (
            <p className="mt-6 text-sm text-gray-500">
              {salon.addressLine1}, {salon.city}, {salon.state} {salon.zipCode}
            </p>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Our Services</h2>
          <p className="text-center text-gray-500 mb-12">Choose from our wide range of beauty treatments</p>

          {categories.map((cat) => (
            <div key={cat.id} className="mb-12">
              <h3 className="text-xl font-bold text-rose-600 mb-4 pb-2 border-b border-rose-100">
                {cat.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.services.map((service) => (
                  <Link
                    key={service.id}
                    to={`/book?serviceId=${service.id}`}
                    className="block p-5 rounded-xl border border-gray-100 hover:border-rose-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                        {service.name}
                      </h4>
                      <span className="text-rose-600 font-bold whitespace-nowrap ml-3">${service.price}</span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-500 mb-2">{service.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {service.duration} min
                      {service.addons.length > 0 && (
                        <span className="ml-2 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                          +{service.addons.length} add-ons
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Meet Our Team</h2>
          <p className="text-center text-gray-500 mb-12">Our talented professionals are here to serve you</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member) => (
              <div key={member.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-300 to-purple-300 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    member.name.split(' ').map(n => n[0]).join('')
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center">{member.name}</h3>
                <p className="text-sm text-rose-600 text-center mb-3 capitalize">{member.role.toLowerCase()}</p>
                {member.bio && (
                  <p className="text-sm text-gray-500 text-center">{member.bio}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-rose-600 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Look Your Best?</h2>
          <p className="text-rose-100 mb-8">Book your appointment now and treat yourself to the pampering you deserve.</p>
          <Link
            to="/book"
            className="inline-block bg-white text-rose-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-rose-50 transition-colors"
          >
            Book Now
          </Link>
        </div>
      </section>

      <Footer salon={salon} />
    </div>
  )
}
