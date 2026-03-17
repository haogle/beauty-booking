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

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'ACTIVE' | 'SUSPENDED'>('All');

  useEffect(() => {
    fetchSalons();
  }, [currentPage, searchQuery, statusFilter]);

  const fetchSalons = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'All' && { status: statusFilter }),
      });

      const response = await api.get(`/api/v1/platform/salons?${params.toString()}`);
      const result = response.data?.data || response.data;

      setSalons(result.data || []);
      setTotalCount(result.total || 0);
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
        return 'bg-green-100 text-green-800';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Salons</h1>
          <p className="text-gray-600">Manage all salons across the platform</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by name or subdomain
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search salons..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading salons...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Salon Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Subdomain
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Industry
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Staff
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Services
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {salons.length > 0 ? (
                    salons.map((salon) => (
                      <tr key={salon.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {salon.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          <a
                            href={`https://${salon.subdomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {salon.subdomain}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {salon.accountUsername}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {salon.customerName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {salon.industry}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-center">
                          {salon.staffCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-center">
                          {salon.serviceCount}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              salon.status
                            )}`}
                          >
                            {salon.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(salon.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            to={`/salons/${salon.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                        No salons found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
              Showing {salons.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} salons
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
