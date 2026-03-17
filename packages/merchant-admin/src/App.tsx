import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { SalonSettingsPage } from './pages/SalonSettingsPage'
import { BusinessHoursPage } from './pages/BusinessHoursPage'
import { BookingSettingsPage } from './pages/BookingSettingsPage'
import { ServicesPage } from './pages/ServicesPage'
import { StaffPage } from './pages/StaffPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { CalendarPage } from './pages/CalendarPage'
import { CustomersPage } from './pages/CustomersPage'
import { GiftCardsPage } from './pages/GiftCardsPage'
import { WebsiteEditorPage } from './pages/WebsiteEditorPage'

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
            path="/appointments"
            element={
              <ProtectedRoute>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route path="/services" element={<Navigate to="/website-editor" replace />} />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gift-cards"
            element={
              <ProtectedRoute>
                <GiftCardsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute>
                <StaffPage />
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
          <Route
            path="/website-editor"
            element={
              <ProtectedRoute>
                <WebsiteEditorPage />
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
