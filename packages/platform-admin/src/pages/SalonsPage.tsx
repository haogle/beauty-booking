import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';

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
  city: string;
  state: string;
  zipCode: string;
  createdAt: string;
  updatedAt: string;
  accountUsername: string;
  platformName: string;
  customerName: string;
  staffCount: number;
  serviceCount: number;
}

interface SalonStats {
  total: number;
  active: number;
  suspended: number;
}

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'ACTIVE' | 'SUSPENDED'>('All');
  const [industryFilter, setIndustryFilter] = useState<string>('All');
  const [stats, setStats] = useState<SalonStats>({
    total: 0,
    active: 0,
    suspended: 0,
  });

  useEffect(() => {
    fetchSalons();
  }, [currentPage, searchQuery, statusFilter, industryFilter]);

  const fetchSalons = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'All' && { status: statusFilter }),
        ...(industryFilter !== 'All' && { industry: industryFilter }),
      });

      const response = await api.get(`/api/v1/platform/salons?${params.toString()}`);
      const result = response.data?.data || response.data;

      setSalons(result.data || []);
      setTotalCount(result.total || 0);

      // Calculate stats
      const salonsData = result.data || [];
      const activeCount = salonsData.filter(
        (s: Salon) => s.status === 'ACTIVE'
      ).length;
      const suspendedCount = salonsData.filter(
        (s: Salon) => s.status === 'SUSPENDED'
      ).length;

      setStats({
        total: result.total || 0,
        active: activeCount,
        suspended: suspendedCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch salons');
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELETED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as 'All' | 'ACTIVE' | 'SUSPENDED');
    setCurrentPage(1);
  };

  const handleIndustryFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIndustryFilter(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Get unique industries from all salons for filter dropdown
  const industries = Array.from(new Set(salons.map((s) => s.industry))).sort();

  return (
    <Layout>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">Salons</h1>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
              {totalCount}
            </span>
          </div>
          <p className="text-gray-600">
            Manage and monitor all salons across your platform
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
            <svg
              className="h-5 w-5 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Salons</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.total}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Active</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {stats.active}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Suspended</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {stats.suspended}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4v2m0 4v2M6.343 17.657l1.414-1.414m2.828 0l1.414 1.414m0-2.828l1.414-1.414m2.828 0l1.414 1.414"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name or subdomain..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={handleStatusFilter}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="All">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={industryFilter}
                onChange={handleIndustryFilter}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="All">All Industries</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block">
              <div className="animate-spin h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading salons...</p>
          </div>
        ) : salons.length > 0 ? (
          <>
            {/* Salon Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {salons.map((salon) => (
                <div
                  key={salon.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <Link
                        to={`/salons/${salon.id}`}
                        className="text-xl font-bold text-gray-900 hover:text-blue-600 transition line-clamp-2"
                      >
                        {salon.name}
                      </Link>
                      <span
                        className={`flex-shrink-0 inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                          salon.status
                        )}`}
                      >
                        {salon.status === 'ACTIVE'
                          ? '● Active'
                          : salon.status === 'SUSPENDED'
                            ? '⊙ Suspended'
                            : '✕ Deleted'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1">
                    {/* Subdomain and Industry Row */}
                    <div className="flex items-center gap-3 mb-4">
                      <a
                        href={`https://${salon.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm break-all"
                      >
                        {salon.subdomain}
                      </a>
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                        {salon.industry}
                      </span>
                    </div>

                    {/* Owner and Customer Row */}
                    <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                          Owner
                        </p>
                        <p className="text-gray-900 font-medium mt-1">
                          {salon.accountUsername}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                          Customer
                        </p>
                        <p className="text-gray-900 font-medium mt-1">
                          {salon.customerName}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mb-4 space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <span>{salon.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="truncate">{salon.email || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <span className="font-medium text-gray-900">
                          {salon.staffCount}
                        </span>
                        <span className="text-gray-600">staff</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span className="font-medium text-gray-900">
                          {salon.serviceCount}
                        </span>
                        <span className="text-gray-600">services</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      Created{' '}
                      {new Date(salon.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <Link
                      to={`/salons/${salon.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 transition"
                    >
                      View Details
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 mb-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {/* Results Info */}
            <div className="text-center text-sm text-gray-600">
              Showing{' '}
              {salons.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span>{' '}
              {totalCount === 1 ? 'salon' : 'salons'}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No salons found
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'All' || industryFilter !== 'All'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first salon to the platform'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
