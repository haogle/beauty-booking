import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import SalonsPage from './pages/SalonsPage'
import SalonDetailPage from './pages/SalonDetailPage'
import SettingsPage from './pages/SettingsPage'

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
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
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <CustomerDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accounts/:id"
            element={
              <ProtectedRoute>
                <AccountDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/salons"
            element={
              <ProtectedRoute>
                <SalonsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/salons/:id"
            element={
              <ProtectedRoute>
                <SalonDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
