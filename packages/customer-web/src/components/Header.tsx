import { Link } from 'react-router-dom'

interface HeaderProps {
  salonName: string
  phone?: string
}

export function Header({ salonName, phone }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-rose-600">
          {salonName}
        </Link>
        <div className="flex items-center gap-4">
          {phone && (
            <a href={`tel:${phone}`} className="text-gray-600 hover:text-rose-600 text-sm hidden sm:block">
              {phone}
            </a>
          )}
          <Link
            to="/book"
            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </header>
  )
}
