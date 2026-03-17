import React, { useState } from 'react'
import Layout from '../components/Layout'

const SettingsPage: React.FC = () => {
  const [platformName, setPlatformName] = useState('Beauty Booking')
  const [supportEmail, setSupportEmail] = useState('support@beautybooking.com')
  const [defaultCurrency, setDefaultCurrency] = useState('USD')
  const [defaultTimezone, setDefaultTimezone] = useState('America/New_York')
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    // Placeholder: In production, save to platform_settings table
    setTimeout(() => {
      setIsSaving(false)
      setSuccessMessage('Settings saved successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    }, 500)
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600 mt-2">Configure global platform settings</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Default Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Default Configuration</h2>
          <p className="text-gray-500 text-sm mb-4">
            These defaults are applied when creating new salons.
          </p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="CNY">CNY - Chinese Yuan</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Timezone</label>
              <select
                value={defaultTimezone}
                onChange={(e) => setDefaultTimezone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Toronto">Toronto (ET)</option>
                <option value="America/Vancouver">Vancouver (PT)</option>
                <option value="Asia/Shanghai">China Standard Time (CST)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Deployment Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Deployment Information</h2>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">API Server</span>
              <a href="https://beauty-booking-api.vercel.app" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium">
                beauty-booking-api.vercel.app
              </a>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Merchant Admin</span>
              <a href="https://beauty-booking-merchant-admin.vercel.app" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium">
                beauty-booking-merchant-admin.vercel.app
              </a>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Customer Web</span>
              <a href="https://beauty-booking-customer-web.vercel.app" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium">
                beauty-booking-customer-web.vercel.app
              </a>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Platform Admin</span>
              <a href="https://beauty-booking-platform-admin-8euvmjwtb.vercel.app" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium">
                beauty-booking-platform-admin
              </a>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Database</span>
              <span className="text-gray-900 font-medium">Neon PostgreSQL (Serverless)</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Links</h2>
          <div className="space-y-3">
            <a
              href="https://github.com/haogle/beauty-booking"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-900 font-medium">GitHub Repository</span>
              <span className="text-gray-400">→</span>
            </a>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-900 font-medium">Vercel Dashboard</span>
              <span className="text-gray-400">→</span>
            </a>
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-900 font-medium">Neon Database Console</span>
              <span className="text-gray-400">→</span>
            </a>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </Layout>
  )
}

export default SettingsPage
