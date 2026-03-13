import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Beauty Booking</h1>
          <p className="text-sm text-gray-500 mt-1">Platform Admin</p>
        </div>

        <nav className="p-4 space-y-2">
          <Link
            to="/dashboard"
            className={`block px-4 py-2 rounded-lg transition-colors ${
              isActive('/dashboard')
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/customers"
            className={`block px-4 py-2 rounded-lg transition-colors ${
              isActive('/customers')
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Customers
          </Link>
          <Link
            to="/accounts"
            className={`block px-4 py-2 rounded-lg transition-colors ${
              isActive('/accounts')
                ? 'bg-blue-100 text-blue-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Accounts
          </Link>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-600 mb-3">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Layout
