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

interface ServiceCategory {
  id: string;
  name: string;
  salonId: string;
  createdAt?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  category?: string;
  categoryId?: string;
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
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(TabType.OVERVIEW);

  // Data state
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ type: string; item: any } | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState<{ name: string }>({ name: '' });
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({
    name: '',
    description: '',
    price: 0,
    duration: 30,
    categoryId: '',
    isActive: true,
  });
  const [staffForm, setStaffForm] = useState<Partial<StaffMember>>({
    name: '',
    email: '',
    phone: '',
    role: 'TECHNICIAN',
  });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('All');
  const [editingBusinessHours, setEditingBusinessHours] = useState(false);
  const [editingBookingSettings, setEditingBookingSettings] = useState(false);
  const [businessHoursForm, setBusinessHoursForm] = useState<Record<number, { openTime: string; closeTime: string; isClosed: boolean }>>({});
  const [bookingSettingsForm, setBookingSettingsForm] = useState<BookingSettings | null>(null);

  useEffect(() => {
    loadSalon();
  }, [id]);

  useEffect(() => {
    if (salon && activeTab === TabType.SERVICES) {
      loadServices();
      loadServiceCategories();
    }
  }, [activeTab, salon]);

  useEffect(() => {
    if (salon && activeTab === TabType.STAFF) {
      loadStaff();
    }
  }, [activeTab, salon]);

  useEffect(() => {
    if (salon && activeTab === TabType.BOOKINGS) {
      loadBookings();
    }
  }, [activeTab, salon]);

  useEffect(() => {
    if (salon && activeTab === TabType.SETTINGS) {
      loadBusinessHours();
      loadBookingSettings();
    }
  }, [activeTab, salon]);

  const loadSalon = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/platform/salons/${id}`);
      const salonData = response.data?.data || response.data;
      setSalon(salonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salon');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/v1/platform/salons/${id}/services`);
      const data = response.data?.data || response.data;
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  const loadServiceCategories = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/v1/platform/salons/${id}/service-categories`);
      const data = response.data?.data || response.data;
      setServiceCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load service categories:', err);
    }
  };

  const loadStaff = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/v1/platform/salons/${id}/staff`);
      const data = response.data?.data || response.data;
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  };

  const loadBookings = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/v1/platform/salons/${id}/appointments`);
      const data = response.data?.data || response.data;
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  const loadBusinessHours = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/v1/platform/salons/${id}/business-hours`);
      const data = response.data?.data || response.data;
      const hours = Array.isArray(data) ? data : [];
      setBusinessHours(hours);

      const form: Record<number, { openTime: string; closeTime: string; isClosed: boolean }> = {};
      hours.forEach((h) => {
        form[h.dayOfWeek] = {
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        };
      });
      setBusinessHoursForm(form);
    } catch (err) {
      console.error('Failed to load business hours:', err);
    }
  };

  const loadBookingSettings = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/api/v1/platform/salons/${id}/booking-settings`);
      const data = response.data?.data || response.data;
      setBookingSettings(data);
      setBookingSettingsForm(data);
    } catch (err) {
      console.error('Failed to load booking settings:', err);
    }
  };

  // Category CRUD
  const handleCreateCategory = async () => {
    if (!id || !categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }
    try {
      await api.post(`/api/v1/platform/salons/${id}/service-categories`, categoryForm);
      showSuccessMessage('Category created successfully');
      setCategoryForm({ name: '' });
      setShowCategoryModal(false);
      await loadServiceCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  // Service CRUD
  const handleCreateService = async () => {
    if (!id || !serviceForm.name?.trim()) {
      setError('Service name is required');
      return;
    }
    try {
      await api.post(`/api/v1/platform/salons/${id}/services`, serviceForm);
      showSuccessMessage('Service created successfully');
      setServiceForm({ name: '', description: '', price: 0, duration: 30, categoryId: '', isActive: true });
      setShowServiceModal(false);
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service');
    }
  };

  const handleUpdateService = async () => {
    if (!id || !editingService) return;
    try {
      await api.put(`/api/v1/platform/salons/${id}/services/${editingService.id}`, editingService);
      showSuccessMessage('Service updated successfully');
      setEditingService(null);
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!id) return;
    try {
      await api.delete(`/api/v1/platform/salons/${id}/services/${serviceId}`);
      showSuccessMessage('Service deleted successfully');
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    }
  };

  // Staff CRUD
  const handleCreateStaff = async () => {
    if (!id || !staffForm.name?.trim() || !staffForm.email?.trim()) {
      setError('Name and email are required');
      return;
    }
    try {
      await api.post(`/api/v1/platform/salons/${id}/staff`, staffForm);
      showSuccessMessage('Staff member added successfully');
      setStaffForm({ name: '', email: '', phone: '', role: 'TECHNICIAN' });
      setShowStaffModal(false);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff member');
    }
  };

  const handleUpdateStaff = async () => {
    if (!id || !editingStaff) return;
    try {
      await api.put(`/api/v1/platform/salons/${id}/staff/${editingStaff.id}`, editingStaff);
      showSuccessMessage('Staff member updated successfully');
      setEditingStaff(null);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!id) return;
    try {
      await api.delete(`/api/v1/platform/salons/${id}/staff/${staffId}`);
      showSuccessMessage('Staff member deleted successfully');
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member');
    }
  };

  // Booking status update
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    if (!id) return;
    try {
      await api.put(`/api/v1/platform/salons/${id}/appointments/${bookingId}/status`, { status: newStatus });
      showSuccessMessage(`Booking status updated to ${newStatus}`);
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking status');
    }
  };

  // Business hours update
  const handleSaveBusinessHours = async () => {
    if (!id) return;
    try {
      const hoursArray = Object.entries(businessHoursForm).map(([dayOfWeek, { openTime, closeTime, isClosed }]) => ({
        dayOfWeek: parseInt(dayOfWeek),
        openTime,
        closeTime,
        isClosed,
      }));
      await api.put(`/api/v1/platform/salons/${id}/business-hours`, { hours: hoursArray });
      showSuccessMessage('Business hours updated successfully');
      setEditingBusinessHours(false);
      await loadBusinessHours();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update business hours');
    }
  };

  // Booking settings update
  const handleSaveBookingSettings = async () => {
    if (!id || !bookingSettingsForm) return;
    try {
      await api.put(`/api/v1/platform/salons/${id}/booking-settings`, bookingSettingsForm);
      showSuccessMessage('Booking settings updated successfully');
      setEditingBookingSettings(false);
      await loadBookingSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking settings');
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const filteredBookings = bookingStatusFilter === 'All'
    ? bookings
    : bookings.filter(b => b.status === bookingStatusFilter);

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <p className="text-gray-600">Loading salon details...</p>
        </div>
      </Layout>
    );
  }

  if (!salon) {
    return (
      <Layout>
        <div className="p-8">
          <p className="text-red-600">Salon not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{salon.name}</h1>
            <p className="text-gray-600 mt-1">{salon.email} • {salon.phone}</p>
          </div>
          <Link
            to="/salons"
            className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md"
          >
            Back to Salons
          </Link>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex space-x-8">
            {Object.values(TabType).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as string)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === TabType.OVERVIEW && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Subdomain</p>
                  <p className="font-medium">{salon.subdomain}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <p className={`font-medium ${salon.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                    {salon.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Currency</p>
                  <p className="font-medium">{salon.currency}</p>
                </div>
                <div>
                  <p className="text-gray-600">Timezone</p>
                  <p className="font-medium">{salon.timezone}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Address</h2>
              <div className="space-y-3 text-sm">
                <p>{salon.addressLine1}</p>
                {salon.addressLine2 && <p>{salon.addressLine2}</p>}
                <p>{salon.city}, {salon.state} {salon.zipCode}</p>
                <p>{salon.country}</p>
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === TabType.SERVICES && (
          <div>
            <div className="flex justify-end gap-4 mb-6">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Category
              </button>
              <button
                onClick={() => {
                  setEditingService(null);
                  setServiceForm({ name: '', description: '', price: 0, duration: 30, categoryId: '', isActive: true });
                  setShowServiceModal(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create Service
              </button>
            </div>

            {serviceCategories.length === 0 ? (
              <p className="text-gray-600">No service categories yet. Create one to get started.</p>
            ) : (
              <div className="space-y-6">
                {serviceCategories.map((category) => {
                  const categoryServices = services.filter(s => s.categoryId === category.id);
                  return (
                    <div key={category.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold mb-4">{category.name}</h3>
                      {categoryServices.length === 0 ? (
                        <p className="text-gray-500 text-sm">No services in this category</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">Name</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">Description</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">Price</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">Duration</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">Active</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryServices.map((service) => (
                                <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-sm">{service.name}</td>
                                  <td className="py-3 px-4 text-sm text-gray-600">{service.description || '-'}</td>
                                  <td className="py-3 px-4 text-sm font-medium">{salon.currency} {service.price}</td>
                                  <td className="py-3 px-4 text-sm">{service.duration} min</td>
                                  <td className="py-3 px-4 text-sm">
                                    <button
                                      onClick={async () => {
                                        const updated = { ...service, isActive: !service.isActive };
                                        setEditingService(updated);
                                        await handleUpdateService();
                                        setEditingService(null);
                                      }}
                                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        service.isActive
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {service.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    <button
                                      onClick={() => {
                                        setEditingService(service);
                                        setServiceForm(service);
                                        setShowServiceModal(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 mr-3"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => setShowConfirm({ type: 'service', item: service })}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === TabType.STAFF && (
          <div>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => {
                  setEditingStaff(null);
                  setStaffForm({ name: '', email: '', phone: '', role: 'TECHNICIAN' });
                  setShowStaffModal(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Staff Member
              </button>
            </div>

            {staff.length === 0 ? (
              <p className="text-gray-600">No staff members yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((member) => (
                  <div key={member.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{member.name}</h3>
                        <p className="text-sm text-gray-600 bg-gray-100 inline-block px-2 py-1 rounded mt-1">
                          {member.role}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingStaff(member);
                            setStaffForm(member);
                            setShowStaffModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowConfirm({ type: 'staff', item: member })}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {member.email && <p><span className="text-gray-600">Email:</span> {member.email}</p>}
                      {member.phone && <p><span className="text-gray-600">Phone:</span> {member.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === TabType.BOOKINGS && (
          <div>
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 block mb-2">Filter by Status</label>
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option>All</option>
                <option>PENDING</option>
                <option>CONFIRMED</option>
                <option>COMPLETED</option>
                <option>CANCELLED</option>
                <option>NO_SHOW</option>
              </select>
            </div>

            {filteredBookings.length === 0 ? (
              <p className="text-gray-600">No bookings found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg border border-gray-200">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Service</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date & Time</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Staff</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Price</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{booking.customerName}</td>
                        <td className="py-3 px-4 text-sm">{booking.service}</td>
                        <td className="py-3 px-4 text-sm">{booking.date} {booking.time}</td>
                        <td className="py-3 px-4 text-sm">{booking.staffAssigned || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium">{salon.currency} {booking.price}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                            booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            booking.status === 'NO_SHOW' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <select
                            value={booking.status}
                            onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="NO_SHOW">NO_SHOW</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === TabType.SETTINGS && (
          <div className="space-y-8">
            {/* Business Hours Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Business Hours</h2>
                {!editingBusinessHours ? (
                  <button
                    onClick={() => setEditingBusinessHours(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBusinessHours(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveBusinessHours}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {editingBusinessHours ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <div key={day} className="grid grid-cols-4 gap-4 items-center">
                      <div className="text-sm font-medium">{dayNames[day]}</div>
                      <div>
                        <input
                          type="checkbox"
                          checked={businessHoursForm[day]?.isClosed ?? false}
                          onChange={(e) => {
                            setBusinessHoursForm({
                              ...businessHoursForm,
                              [day]: { ...businessHoursForm[day], isClosed: e.target.checked },
                            });
                          }}
                          className="rounded"
                        />
                        <label className="ml-2 text-sm">Closed</label>
                      </div>
                      {!businessHoursForm[day]?.isClosed && (
                        <>
                          <input
                            type="time"
                            value={businessHoursForm[day]?.openTime ?? ''}
                            onChange={(e) => {
                              setBusinessHoursForm({
                                ...businessHoursForm,
                                [day]: { ...businessHoursForm[day], openTime: e.target.value },
                              });
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="time"
                            value={businessHoursForm[day]?.closeTime ?? ''}
                            onChange={(e) => {
                              setBusinessHoursForm({
                                ...businessHoursForm,
                                [day]: { ...businessHoursForm[day], closeTime: e.target.value },
                              });
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {businessHours.map((hour) => (
                    <div key={hour.dayOfWeek} className="flex justify-between text-sm">
                      <span className="font-medium">{dayNames[hour.dayOfWeek]}</span>
                      <span className="text-gray-600">
                        {hour.isClosed ? 'Closed' : `${hour.openTime} - ${hour.closeTime}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booking Settings Section */}
            {bookingSettings && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">Booking Settings</h2>
                  {!editingBookingSettings ? (
                    <button
                      onClick={() => setEditingBookingSettings(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingBookingSettings(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBookingSettings}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {editingBookingSettings && bookingSettingsForm ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Buffer Minutes</label>
                      <input
                        type="number"
                        value={bookingSettingsForm.bufferMinutes}
                        onChange={(e) => setBookingSettingsForm({
                          ...bookingSettingsForm,
                          bufferMinutes: parseInt(e.target.value),
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Advance Minutes</label>
                      <input
                        type="number"
                        value={bookingSettingsForm.minAdvanceMinutes}
                        onChange={(e) => setBookingSettingsForm({
                          ...bookingSettingsForm,
                          minAdvanceMinutes: parseInt(e.target.value),
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={bookingSettingsForm.allowMultiService}
                        onChange={(e) => setBookingSettingsForm({
                          ...bookingSettingsForm,
                          allowMultiService: e.target.checked,
                        })}
                        className="rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">Allow Multiple Services</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={bookingSettingsForm.allowMultiPerson}
                        onChange={(e) => setBookingSettingsForm({
                          ...bookingSettingsForm,
                          allowMultiPerson: e.target.checked,
                        })}
                        className="rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">Allow Multiple People</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={bookingSettingsForm.smsVerification}
                        onChange={(e) => setBookingSettingsForm({
                          ...bookingSettingsForm,
                          smsVerification: e.target.checked,
                        })}
                        className="rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">SMS Verification</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={bookingSettingsForm.allowGenderFilter}
                        onChange={(e) => setBookingSettingsForm({
                          ...bookingSettingsForm,
                          allowGenderFilter: e.target.checked,
                        })}
                        className="rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">Allow Gender Filter</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Strategy</label>
                      <select
                        value={bookingSettingsForm.assignmentStrategy}
                        onChange={(e) => setBookingSettingsForm({
                          ...bookingSettingsForm,
                          assignmentStrategy: e.target.value,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="ROUND_ROBIN">Round Robin</option>
                        <option value="LOAD_BALANCED">Load Balanced</option>
                        <option value="CUSTOMER_PREFERENCE">Customer Preference</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buffer Minutes</span>
                      <span className="font-medium">{bookingSettings.bufferMinutes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Advance Minutes</span>
                      <span className="font-medium">{bookingSettings.minAdvanceMinutes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Allow Multiple Services</span>
                      <span className="font-medium">{bookingSettings.allowMultiService ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Allow Multiple People</span>
                      <span className="font-medium">{bookingSettings.allowMultiPerson ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SMS Verification</span>
                      <span className="font-medium">{bookingSettings.smsVerification ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Allow Gender Filter</span>
                      <span className="font-medium">{bookingSettings.allowGenderFilter ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assignment Strategy</span>
                      <span className="font-medium">{bookingSettings.assignmentStrategy}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Service Category</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ name: e.target.value })}
                placeholder="e.g., Hair Services"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingService ? 'Edit Service' : 'Create Service'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
                <input
                  type="text"
                  value={serviceForm.name || ''}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={serviceForm.description || ''}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={serviceForm.categoryId || ''}
                  onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select a category</option>
                  {serviceCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.price || 0}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (min)</label>
                  <input
                    type="number"
                    value={serviceForm.duration || 30}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowServiceModal(false);
                  setEditingService(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingService ? handleUpdateService : handleCreateService}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingService ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={staffForm.name || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={staffForm.email || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={staffForm.phone || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={staffForm.role || 'TECHNICIAN'}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="OWNER">Owner</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowStaffModal(false);
                  setEditingStaff(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingStaff ? handleUpdateStaff : handleCreateStaff}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingStaff ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this{' '}
              {showConfirm.type === 'service' ? 'service' : 'staff member'}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (showConfirm.type === 'service') {
                    await handleDeleteService(showConfirm.item.id);
                  } else {
                    await handleDeleteStaff(showConfirm.item.id);
                  }
                  setShowConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
