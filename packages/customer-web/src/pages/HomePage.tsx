import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { SALON_SUBDOMAIN, unwrap } from '../lib/api'
import type { Salon, ServiceCategory, Staff } from '../lib/types'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'

interface WebsiteConfig {
  theme: { primaryColor: string; secondaryColor: string; fontFamily: string; borderRadius: string }
  navbar: { logo: string; title: string; links: { label: string; href: string; enabled: boolean }[] }
  announcement: string
  hero: { enabled: boolean; type: string; title: string; subtitle: string; backgroundImage: string; ctaText: string; ctaLink: string }
  sections: { id: string; type: string; enabled: boolean; title: string; subtitle: string; content?: string; image?: string; images?: string[]; items?: any[]; order: number }[]
  footer: { enabled: boolean; text: string; showSocial: boolean; socialLinks: { facebook: string; instagram: string; twitter: string; tiktok: string } }
  servicePage: { layout: string; showPrices: boolean; showDuration: boolean; showDescription: boolean; coverImage: string }
  seo: { title: string; description: string; keywords: string; ogImage: string }
  publishedAt: string | null
}

export function HomePage() {
  const [salon, setSalon] = useState<Salon | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [config, setConfig] = useState<WebsiteConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salonRes, servicesRes, staffRes, configRes] = await Promise.all([
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/services`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/staff`),
          api.get(`/api/v1/public/salon/${SALON_SUBDOMAIN}/website-config`).catch(() => null),
        ])
        setSalon(unwrap(salonRes))
        setCategories(unwrap(servicesRes))
        setStaff(unwrap(staffRes))
        const cfg = configRes ? unwrap(configRes) : null
        setConfig(cfg)

        // Update page title from SEO config
        if (cfg?.seo?.title) {
          document.title = cfg.seo.title
        }
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

  const theme = config?.theme
  const primaryColor = theme?.primaryColor || '#e11d48'
  const secondaryColor = theme?.secondaryColor || '#9333ea'
  const fontFamily = theme?.fontFamily || 'Inter'
  const borderRadius = theme?.borderRadius || '8px'

  // If we have a website config, render the dynamic version
  if (config) {
    const sortedSections = [...(config.sections || [])].filter(s => s.enabled).sort((a, b) => a.order - b.order)

    return (
      <div className="min-h-screen bg-white" style={{ fontFamily }}>
        {/* Announcement Bar */}
        {config.announcement && (
          <div className="text-center py-2 px-4 text-white text-sm font-medium" style={{ backgroundColor: primaryColor }}>
            {config.announcement}
          </div>
        )}

        {/* Custom Navbar */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              {config.navbar.logo && (
                <img src={config.navbar.logo} alt="" className="h-8 object-contain" />
              )}
              <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                {config.navbar.title || salon.name}
              </span>
            </Link>
            <div className="flex items-center gap-6">
              {(config.navbar.links || []).filter(l => l.enabled).map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors hidden md:block"
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/book"
                className="text-white px-5 py-2 text-sm font-semibold transition-colors"
                style={{ backgroundColor: primaryColor, borderRadius }}
              >
                Book Now
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        {config.hero.enabled && (
          <section
            className="relative py-24 md:py-32"
            style={{
              backgroundImage: config.hero.backgroundImage
                ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${config.hero.backgroundImage})`
                : `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h1
                className={`text-4xl md:text-6xl font-bold mb-4 ${config.hero.backgroundImage ? 'text-white drop-shadow-lg' : 'text-gray-900'}`}
              >
                {config.hero.title}
              </h1>
              <p className={`text-lg mb-8 max-w-2xl mx-auto ${config.hero.backgroundImage ? 'text-white/90' : 'text-gray-600'}`}>
                {config.hero.subtitle}
              </p>
              {config.hero.ctaText && (
                <Link
                  to={config.hero.ctaLink || '/book'}
                  className="inline-block text-white px-8 py-4 text-lg font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ backgroundColor: primaryColor, borderRadius }}
                >
                  {config.hero.ctaText}
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Dynamic Sections */}
        {sortedSections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            categories={categories}
            staff={staff}
            salon={salon}
            primaryColor={primaryColor}
            borderRadius={borderRadius}
          />
        ))}

        {/* Footer */}
        {config.footer.enabled ? (
          <footer className="bg-gray-900 text-gray-300 py-12">
            <div className="max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-white font-bold text-lg mb-3">{config.navbar.title || salon.name}</h3>
                  {config.footer.text && <p className="text-sm">{config.footer.text}</p>}
                  {salon.addressLine1 && (
                    <p className="text-sm mt-2">
                      {salon.addressLine1}<br/>
                      {salon.city}, {salon.state} {salon.zipCode}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-white font-bold text-lg mb-3">Hours</h3>
                  <div className="text-sm space-y-1">
                    {salon.businessHours
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                      .map((h) => (
                        <div key={h.dayOfWeek} className="flex justify-between">
                          <span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][h.dayOfWeek]}</span>
                          <span>{h.isClosed ? 'Closed' : `${h.openTime} - ${h.closeTime}`}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  {config.footer.showSocial && (
                    <div>
                      <h3 className="text-white font-bold text-lg mb-3">Follow Us</h3>
                      <div className="flex gap-4">
                        {config.footer.socialLinks?.facebook && (
                          <a href={config.footer.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Facebook</a>
                        )}
                        {config.footer.socialLinks?.instagram && (
                          <a href={config.footer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
                        )}
                        {config.footer.socialLinks?.twitter && (
                          <a href={config.footer.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">X</a>
                        )}
                        {config.footer.socialLinks?.tiktok && (
                          <a href={config.footer.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TikTok</a>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <h3 className="text-white font-bold text-lg mb-3">Quick Links</h3>
                    <div className="text-sm space-y-2">
                      <Link to="/book" className="block hover:text-white transition-colors">Book an Appointment</Link>
                      <a href="#services" className="block hover:text-white transition-colors">Our Services</a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
                Powered by Beauty Booking
              </div>
            </div>
          </footer>
        ) : (
          <Footer salon={salon} />
        )}
      </div>
    )
  }

  // ========== FALLBACK: Original static layout ==========
  return (
    <div className="min-h-screen bg-white">
      <Header salonName={salon.name} phone={salon.phone} />

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

      <section id="services" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Our Services</h2>
          <p className="text-center text-gray-500 mb-12">Choose from our wide range of beauty treatments</p>
          {categories.map((cat) => (
            <div key={cat.id} className="mb-12">
              <h3 className="text-xl font-bold text-rose-600 mb-4 pb-2 border-b border-rose-100">{cat.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.services.map((service) => (
                  <Link key={service.id} to={`/book?serviceId=${service.id}`} className="block p-5 rounded-xl border border-gray-100 hover:border-rose-200 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">{service.name}</h4>
                      <span className="text-rose-600 font-bold whitespace-nowrap ml-3">${service.price}</span>
                    </div>
                    {service.description && <p className="text-sm text-gray-500 mb-2">{service.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {service.duration} min
                      {service.addons.length > 0 && <span className="ml-2 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">+{service.addons.length} add-ons</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="team" className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Meet Our Team</h2>
          <p className="text-center text-gray-500 mb-12">Our talented professionals are here to serve you</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {staff.map((member) => (
              <div key={member.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-300 to-purple-300 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" /> : member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center">{member.name}</h3>
                <p className="text-sm text-rose-600 text-center mb-3 capitalize">{member.role.toLowerCase()}</p>
                {member.bio && <p className="text-sm text-gray-500 text-center">{member.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-rose-600 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Look Your Best?</h2>
          <p className="text-rose-100 mb-8">Book your appointment now and treat yourself to the pampering you deserve.</p>
          <Link to="/book" className="inline-block bg-white text-rose-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-rose-50 transition-colors">Book Now</Link>
        </div>
      </section>

      <Footer salon={salon} />
    </div>
  )
}

// ============ SECTION RENDERER ============

function SectionRenderer({
  section,
  categories,
  staff,
  salon,
  primaryColor,
  borderRadius,
}: {
  section: WebsiteConfig['sections'][0]
  categories: ServiceCategory[]
  staff: Staff[]
  salon: Salon
  primaryColor: string
  borderRadius: string
}) {
  switch (section.type) {
    case 'services':
      return (
        <section id="services" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-center text-gray-500 mb-12">{section.subtitle}</p>}
            {categories.map((cat) => (
              <div key={cat.id} className="mb-12">
                <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: primaryColor, borderColor: primaryColor + '30' }}>{cat.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.services.map((service) => (
                    <Link key={service.id} to={`/book?serviceId=${service.id}`} className="block p-5 border border-gray-100 hover:shadow-md transition-all group" style={{ borderRadius }}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">{service.name}</h4>
                        <span className="font-bold whitespace-nowrap ml-3" style={{ color: primaryColor }}>${service.price}</span>
                      </div>
                      {service.description && <p className="text-sm text-gray-500 mb-2">{service.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{service.duration} min</span>
                        {service.addons.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>+{service.addons.length} add-ons</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )

    case 'about':
      return (
        <section id="about" className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-center text-gray-500 mb-8">{section.subtitle}</p>}
            <div className={`max-w-4xl mx-auto ${section.image ? 'grid grid-cols-1 md:grid-cols-2 gap-8 items-center' : ''}`}>
              {section.content && <div className="text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</div>}
              {section.image && <img src={section.image} alt={section.title} className="w-full rounded-xl shadow-lg" style={{ borderRadius }} />}
            </div>
          </div>
        </section>
      )

    case 'gallery':
      return (
        <section id="gallery" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-center text-gray-500 mb-8">{section.subtitle}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(section.images || []).map((img, i) => (
                <img key={i} src={img} alt={`Gallery ${i + 1}`} className="w-full h-48 object-cover hover:opacity-90 transition-opacity" style={{ borderRadius }} />
              ))}
            </div>
          </div>
        </section>
      )

    case 'team':
      return (
        <section id="team" className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-center text-gray-500 mb-12">{section.subtitle}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {staff.map((member) => (
                <div key={member.id} className="bg-white p-6 shadow-sm hover:shadow-md transition-shadow" style={{ borderRadius }}>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}80)` }}>
                    {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" /> : member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 text-center">{member.name}</h3>
                  <p className="text-sm text-center mb-3 capitalize" style={{ color: primaryColor }}>{member.role.toLowerCase()}</p>
                  {member.bio && <p className="text-sm text-gray-500 text-center">{member.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'testimonials':
      return (
        <section id="testimonials" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-center text-gray-500 mb-12">{section.subtitle}</p>}
            {(section.items || []).length === 0 ? (
              <p className="text-center text-gray-400">No testimonials yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(section.items || []).map((item: any, i: number) => (
                  <div key={i} className="bg-gray-50 p-6 rounded-xl">
                    <p className="text-gray-600 italic mb-4">"{item.text}"</p>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )

    case 'contact':
      return (
        <section id="contact" className="py-16 text-white text-center" style={{ backgroundColor: primaryColor }}>
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
            {section.subtitle && <p className="text-white/80 mb-4">{section.subtitle}</p>}
            {salon.phone && <p className="text-lg mb-2">{salon.phone}</p>}
            {salon.email && <p className="text-lg mb-6">{salon.email}</p>}
            {salon.addressLine1 && <p className="text-white/70 mb-6">{salon.addressLine1}, {salon.city}, {salon.state} {salon.zipCode}</p>}
            <Link to="/book" className="inline-block bg-white px-8 py-4 text-lg font-semibold hover:bg-gray-50 transition-colors" style={{ color: primaryColor, borderRadius }}>Book Now</Link>
          </div>
        </section>
      )

    case 'custom':
      return (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-center text-gray-500 mb-8">{section.subtitle}</p>}
            {section.content && <div className="max-w-3xl mx-auto text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</div>}
            {section.image && <img src={section.image} alt={section.title} className="w-full max-w-2xl mx-auto mt-8 rounded-xl shadow-lg" style={{ borderRadius }} />}
          </div>
        </section>
      )

    default:
      return null
  }
}
