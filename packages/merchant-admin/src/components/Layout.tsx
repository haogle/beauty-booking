import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/appointments', label: 'Appointments' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/customers', label: 'Customers' },
    { path: '/gift-cards', label: 'Gift Cards' },
    { path: '/services', label: 'Services' },
    { path: '/staff', label: 'Staff' },
    // Settings section
    { path: '/salon-settings', label: 'Salon Settings' },
    { path: '/business-hours', label: 'Business Hours' },
    { path: '/booking-settings', label: 'Booking Settings' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Beauty Booking</h1>
          <p className="text-sm text-gray-500">Merchant Admin</p>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-6 py-3 border-l-4 transition-colors ${
                location.pathname === item.path
                  ? 'border-blue-500 bg-blue-50 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-gray-200 bg-white">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
