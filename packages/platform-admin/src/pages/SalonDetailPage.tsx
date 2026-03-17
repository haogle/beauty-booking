import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';

interface BusinessHours {
  id: string;
  salonId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface BookingSettings {
  bufferMinutes: number;
  minAdvanceMinutes: number;
  allowMultiService: boolean;
  allowMultiPerson: boolean;
  smsVerification: boolean;
  assignmentStrategy: string;
  allowGenderFilter: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  category?: string;
  isActive: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  role: 'OWNER' | 'TECHNICIAN' | 'RECEPTIONIST';
  phone?: string;
  email?: string;
  avatar?: string;
}

interface Booking {
  id: string;
  date: string;
  time: string;
  customerName: string;
  service: string;
  staffAssigned?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  price: number;
}

interface Salon {
  id: string;
  accountId: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  industry: string;
  currency: string;
  timezone: string;
  phone: string;
  email: string;
  logoUrl?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
  accountUsername: string;
  businessHours: BusinessHours[];
  bookingSettings: BookingSettings;
  websiteConfig?: Record<string, any>;
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TabType = {
  OVERVIEW: 'overview',
  SERVICES: 'services',
  STAFF: 'staff',
  BOOKINGS: 'bookings',
  SETTINGS: 'settings',
} as const;

export default function SalonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Salon>>({});

  // Tab management
  const [activeTab, setActiveTab] = useState(TabType.OVERVIEW);
  const [tabData, setTabData] = useState<Record<string, any>>({
    services: null,
    staff: null,
    bookings: null,
  });
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);

  useEffect(() => {
    fetchSalon();
  }, [id]);

  useEffect(() => {
    // Lazy load tab data when tab becomes active
    if (activeTab === TabType.SERVICES && !tabData.services) {
      fetchServices();
    } else if (activeTab === TabType.STAFF && !tabData.staff) {
      fetchStaff();
    } else if (activeTab === TabType.BOOKINGS && !tabData.bookings) {
      fetchBookings();
    }
  }, [activeTab]);

  const fetchSalon = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/api/v1/platform/salons/${id}`);
      const salonData = response.data?.data || response.data;

      setSalon(salonData);
      setEditData(salonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch salon details');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      setTabLoading((prev) => ({ ...prev, services: true }));
      const response = await api.get(`/api/v1/platform/salons/${id}/services`);
      const servicesData = response.data?.data || response.data || [];
      setTabData((prev) => ({ ...prev, services: servicesData }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setTabLoading((prev) => ({ ...prev, services: false }));
    }
  };

  const fetchStaff = async () => {
    try {
      setTabLoading((prev) => ({ ...prev, staff: true }));
      const response = await api.get(`/api/v1/platform/salons/${id}/staff`);
      const staffData = response.data?.data || response.data || [];
      setTabData((prev) => ({ ...prev, staff: staffData }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
    } finally {
      setTabLoading((prev) => ({ ...prev, staff: false }));
    }
  };

  const fetchBookings = async (page: number = 1) => {
    try {
      setTabLoading((prev) => ({ ...prev, bookings: true }));
      const response = await api.get(`/api/v1/platform/salons/${id}/bookings?page=${page}&limit=10`);
      const bookingsData = response.data?.data || response.data;
      setTabData((prev) => ({
        ...prev,
        bookings: bookingsData.items || bookingsData.data || [],
      }));
      setBookingsTotal(bookingsData.total || bookingsData.length || 0);
      setBookingsPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setTabLoading((prev) => ({ ...prev, bookings: false }));
    }
  };

  const handleEditToggle = () => {
    if (editing) {
      setEditData(salon || {});
    }
    setEditing(!editing);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!id || !salon) return;

    try {
      setSaving(true);
      setError(null);

      const updatePayload = {
        name: editData.name,
        subdomain: editData.subdomain,
        customDomain: editData.customDomain,
        industry: editData.industry,
        status: editData.status,
        phone: editData.phone,
        email: editData.email,
        currency: editData.currency,
        timezone: editData.timezone,
        addressLine1: editData.addressLine1,
        addressLine2: editData.addressLine2,
        city: editData.city,
        state: editData.state,
        zipCode: editData.zipCode,
        country: editData.country,
      };

      const response = await api.put(`/api/v1/platform/salons/${id}`, updatePayload);
      const updatedSalon = response.data?.data || response.data;

      setSalon(updatedSalon);
      setEditData(updatedSalon);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save salon details');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'TECHNICIAN':
        return 'bg-blue-100 text-blue-800';
      case 'RECEPTIONIST':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">Loading salon details...</div>
        </div>
      </Layout>
    );
  }

  if (error && !salon) {
    return (
      <Layout>
        <div className="p-6">
          <Link to="/salons" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Salons
          </Link>
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error || 'Salon not found'}
          </div>
        </div>
      </Layout>
    );
  }

  if (!salon) return null;

  const displayData = editing ? editData : salon;

  return (
    <Layout>
      <div className="p-6">
        <Link to="/salons" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Salons
        </Link>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              {editing ? (
                <input
                  type="text"
                  value={displayData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="text-3xl font-bold border-b-2 border-blue-500 focus:outline-none mb-2"
                />
              ) : (
                <h1 className="text-3xl font-bold mb-2">{displayData.name}</h1>
              )}
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                  displayData.status || 'ACTIVE'
                )}`}
              >
                {displayData.status}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {activeTab === TabType.OVERVIEW && (
              <>
                {editing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleEditToggle}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Edit
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 flex gap-8">
          {Object.values(TabType).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === TabType.OVERVIEW && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">Basic Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salon Name
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subdomain
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.subdomain || ''}
                          onChange={(e) => handleInputChange('subdomain', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.subdomain}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Domain
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.customDomain || ''}
                          onChange={(e) => handleInputChange('customDomain', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.customDomain || 'None'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.industry || ''}
                          onChange={(e) => handleInputChange('industry', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.industry}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      {editing ? (
                        <select
                          value={displayData.status || 'ACTIVE'}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="DELETED">Deleted</option>
                        </select>
                      ) : (
                        <p className="text-gray-900">{displayData.status}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account ID
                      </label>
                      <p className="text-gray-900 text-sm">{displayData.accountId}</p>
                    </div>
                  </div>
                </div>

                {/* Address Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.addressLine1 || ''}
                          onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.addressLine1}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 2
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.addressLine2 || ''}
                          onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.addressLine2 || 'N/A'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={displayData.city || ''}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{displayData.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={displayData.state || ''}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{displayData.state}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Zip Code
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={displayData.zipCode || ''}
                            onChange={(e) => handleInputChange('zipCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{displayData.zipCode}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={displayData.country || ''}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900">{displayData.country}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Records Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">System Records</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created At
                      </label>
                      <p className="text-gray-900 text-sm">
                        {new Date(displayData.createdAt || '').toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Updated At
                      </label>
                      <p className="text-gray-900 text-sm">
                        {new Date(displayData.updatedAt || '').toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account ID
                      </label>
                      <p className="text-gray-900 text-sm">{displayData.accountId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Contact Info Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">Contact Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.phone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      {editing ? (
                        <input
                          type="email"
                          value={displayData.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Logo URL
                      </label>
                      <p className="text-gray-900 text-sm">
                        {displayData.logoUrl || 'Not set'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.currency || ''}
                          onChange={(e) => handleInputChange('currency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.currency}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={displayData.timezone || ''}
                          onChange={(e) => handleInputChange('timezone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{displayData.timezone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Links Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">Quick Links</h2>
                  <div className="space-y-2">
                    <a
                      href={`https://${salon.subdomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center text-sm font-medium"
                    >
                      Open Customer Site
                    </a>
                    <a
                      href={`https://${salon.subdomain}/merchant`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center text-sm font-medium"
                    >
                      Open Merchant Admin
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === TabType.SERVICES && (
          <div className="space-y-6">
            {tabLoading.services ? (
              <div className="text-center py-8 text-gray-500">Loading services...</div>
            ) : !tabData.services || tabData.services.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No services found</div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Total Services</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {tabData.services.length}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Active Services</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {tabData.services.filter((s: Service) => s.isActive).length}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Set(tabData.services.map((s: Service) => s.category)).size}
                    </p>
                  </div>
                </div>

                {/* Services by Category */}
                {Array.from(
                  new Set(tabData.services.map((s: Service) => s.category || 'Uncategorized'))
                ).map((category) => (
                  <div key={category} className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">{category}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                              Name
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                              Price
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                              Duration
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tabData.services
                            .filter((s: Service) => (s.category || 'Uncategorized') === category)
                            .map((service: Service) => (
                              <tr
                                key={service.id}
                                className="border-b border-gray-200 hover:bg-gray-50"
                              >
                                <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                                  {service.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  {salon?.currency} {service.price}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  {service.duration} min
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <span
                                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                      service.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {service.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === TabType.STAFF && (
          <div>
            {tabLoading.staff ? (
              <div className="text-center py-8 text-gray-500">Loading staff...</div>
            ) : !tabData.staff || tabData.staff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No staff members found</div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {tabData.staff.map((member: StaffMember) => (
                  <div
                    key={member.id}
                    className="bg-white border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          {getInitials(member.name)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                        <span
                          className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getRoleColor(
                            member.role
                          )}`}
                        >
                          {member.role}
                        </span>
                        {member.phone && (
                          <p className="mt-2 text-sm text-gray-600">Phone: {member.phone}</p>
                        )}
                        {member.email && (
                          <p className="text-sm text-gray-600">Email: {member.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === TabType.BOOKINGS && (
          <div className="space-y-6">
            {tabLoading.bookings ? (
              <div className="text-center py-8 text-gray-500">Loading bookings...</div>
            ) : !tabData.bookings || tabData.bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No bookings found</div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          Date & Time
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          Customer
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          Service
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          Staff
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabData.bookings.map((booking: Booking) => (
                        <tr key={booking.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {booking.date} {booking.time}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{booking.customerName}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{booking.service}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {booking.staffAssigned || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${getBookingStatusColor(
                                booking.status
                              )}`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                            {salon?.currency} {booking.price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {bookingsTotal > 10 && (
                  <Pagination
                    currentPage={bookingsPage}
                    totalItems={bookingsTotal}
                    itemsPerPage={10}
                    onPageChange={fetchBookings}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === TabType.SETTINGS && (
          <div className="space-y-6">
            {/* Business Hours Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Business Hours</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Day
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Opens
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Closes
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salon.businessHours && salon.businessHours.length > 0 ? (
                      salon.businessHours.map((hours) => (
                        <tr key={hours.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                            {dayNames[hours.dayOfWeek] || `Day ${hours.dayOfWeek}`}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {hours.isClosed ? '-' : hours.openTime}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">
                            {hours.isClosed ? '-' : hours.closeTime}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                hours.isClosed
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {hours.isClosed ? 'Closed' : 'Open'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                          No business hours configured
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Booking Settings Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Booking Settings</h2>
              {salon.bookingSettings ? (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buffer Minutes
                    </label>
                    <p className="text-gray-900 text-lg font-semibold">
                      {salon.bookingSettings.bufferMinutes} min
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Advance Minutes
                    </label>
                    <p className="text-gray-900 text-lg font-semibold">
                      {salon.bookingSettings.minAdvanceMinutes} min
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Multi-Service Allowed
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        salon.bookingSettings.allowMultiService
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {salon.bookingSettings.allowMultiService ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Multi-Person Allowed
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        salon.bookingSettings.allowMultiPerson
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {salon.bookingSettings.allowMultiPerson ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMS Verification
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        salon.bookingSettings.smsVerification
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {salon.bookingSettings.smsVerification ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assignment Strategy
                    </label>
                    <p className="text-gray-900">{salon.bookingSettings.assignmentStrategy}</p>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender Filter Allowed
                    </label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        salon.bookingSettings.allowGenderFilter
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {salon.bookingSettings.allowGenderFilter ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No booking settings configured</p>
              )}
            </div>

            {/* Domain Management Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Domain Management</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subdomain
                  </label>
                  <p className="text-gray-900 font-monospace">{salon.subdomain}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Domain
                  </label>
                  <p className="text-gray-900 font-monospace">
                    {salon.customDomain || 'Not configured'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
