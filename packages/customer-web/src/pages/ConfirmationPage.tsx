import { Link, useLocation } from 'react-router-dom'
import type { BookingResult } from '../lib/types'

export function ConfirmationPage() {
  const location = useLocation()
  const state = location.state as { booking: BookingResult; salonName: string } | null

  if (!state?.booking) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No booking information found</p>
          <Link to="/" className="text-rose-600 hover:text-rose-700 font-semibold">
            Go Back Home
          </Link>
        </div>
      </div>
    )
  }

  const { booking, salonName } = state

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="max-w-lg mx-auto px-4 py-16">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500">Your appointment has been submitted successfully</p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center mb-6 pb-6 border-b border-gray-100">
            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase">
              {booking.status}
            </span>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-semibold text-gray-900">{booking.service.name}</span>
            </div>

            {booking.addons && booking.addons.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Add-ons</span>
                <span className="font-medium text-gray-900">
                  {booking.addons.map((a) => a.name).join(', ')}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500">Stylist</span>
              <span className="font-semibold text-gray-900">{booking.staff.name}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold text-gray-900">
                {new Date(booking.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-semibold text-gray-900">{booking.startTime} - {booking.endTime}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-medium text-gray-900">{booking.totalDuration} min</span>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-rose-600 text-xl">${booking.totalPrice}</span>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700">
            Your booking is pending confirmation. {salonName} will confirm your appointment shortly.
            Please arrive 5 minutes before your scheduled time.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            to="/book"
            className="block w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-center font-semibold transition-colors"
          >
            Book Another Appointment
          </Link>
          <Link
            to="/"
            className="block w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-xl text-center font-semibold border border-gray-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
