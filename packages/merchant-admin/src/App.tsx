import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { SalonSettingsPage } from './pages/SalonSettingsPage'
import { BusinessHoursPage } from './pages/BusinessHoursPage'
import { BookingSettingsPage } from './pages/BookingSettingsPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salon-settings"
            element={
              <ProtectedRoute>
                <SalonSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business-hours"
            element={
              <ProtectedRoute>
                <BusinessHoursPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking-settings"
            element={
              <ProtectedRoute>
                <BookingSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
