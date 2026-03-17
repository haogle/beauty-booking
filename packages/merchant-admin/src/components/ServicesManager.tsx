import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'

// ============ TYPES ============

interface SvcAddon {
  id?: string
  name: string
  price: number
  duration: number
}

interface SvcService {
  id?: string
  name: string
  description?: string
  price: number
  duration: number
  categoryId?: string
  coverImageUrl?: string
  isActive?: boolean
  sortOrder?: number
  addons?: SvcAddon[]
}

interface SvcCategory {
  id?: string
  name: string
  services?: SvcService[]
}

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
}

// ============ VIEWS ============
type ViewMode = 'list' | 'detail' | 'edit'

// Helper: normalize isActive (API returns boolean, but guard against numeric 0/1)
const isServiceActive = (service: SvcService): boolean => {
  if (service.isActive === undefined || service.isActive === null) return true // default active
  return service.isActive === true || (service.isActive as any) === 1
}

// ============ COMPONENT ============

const ServicesManager: React.FC = () => {
  const [categories, setCategories] = useState<SvcCategory[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedService, setSelectedService] = useState<SvcService | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<SvcCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')

  // Service form (for edit view)
  const [serviceForm, setServiceForm] = useState({
    name: '', description: '', price: '', duration: '', categoryId: '', coverImageUrl: ''
  })

  // Addon form (inline in edit view)
  const [showAddonForm, setShowAddonForm] = useState(false)
  const [editingAddon, setEditingAddon] = useState<SvcAddon | null>(null)
  const [addonForm, setAddonForm] = useState({ name: '', price: '', duration: '' })

  // ============ DATA FETCHING ============

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/merchant/salon/services')
      const result = response.data?.data || response.data
      setCategories(Array.isArray(result) ? result : (result?.categories || []))
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStaff = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/merchant/salon/staff')
      const result = response.data?.data || response.data
      setStaff(Array.isArray(result) ? result : [])
    } catch { /* ignore staff fetch errors */ }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchStaff()
  }, [fetchCategories, fetchStaff])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  // ============ CATEGORY HANDLERS ============

  const openCategoryForm = (cat?: SvcCategory) => {
    if (cat) { setEditingCategory(cat); setCategoryName(cat.name) }
    else { setCategoryName(''); setEditingCategory(null) }
    setShowCategoryForm(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) { setError('Category name is required'); return }
    try {
      if (editingCategory?.id) {
        await api.put(`/api/v1/merchant/salon/service-categories/${editingCategory.id}`, { name: categoryName })
        showSuccess('Category updated')
      } else {
        await api.post('/api/v1/merchant/salon/service-categories', { name: categoryName })
        showSuccess('Category added')
      }
      setCategoryName(''); setEditingCategory(null); setShowCategoryForm(false)
      await fetchCategories()
    } catch (err: any) { setError(err.message || 'Failed to save category') }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category and all its services?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/service-categories/${id}`)
      showSuccess('Category deleted')
      await fetchCategories()
    } catch (err: any) { setError(err.message || 'Failed to delete category') }
  }

  // ============ SERVICE HANDLERS ============

  const openServiceDetail = (service: SvcService) => {
    setSelectedService(service)
    setViewMode('detail')
  }

  const openServiceEdit = (categoryId: string, service?: SvcService) => {
    if (service) {
      setSelectedService(service)
      setServiceForm({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration: service.duration.toString(),
        categoryId: service.categoryId || categoryId,
        coverImageUrl: service.coverImageUrl || ''
      })
    } else {
      setSelectedService(null)
      setServiceForm({ name: '', description: '', price: '', duration: '', categoryId, coverImageUrl: '' })
    }
    setSelectedCategoryId(categoryId)
    setShowAddonForm(false)
    setEditingAddon(null)
    setViewMode('edit')
  }

  const handleSaveService = async () => {
    const { name, description, price, duration, categoryId, coverImageUrl } = serviceForm
    if (!name.trim() || !price || !duration || !categoryId) {
      setError('Name, price, duration, and category are required')
      return
    }
    try {
      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        duration: parseInt(duration),
        categoryId,
      }
      if (coverImageUrl.trim()) payload.coverImageUrl = coverImageUrl.trim()

      if (selectedService?.id) {
        await api.put(`/api/v1/merchant/salon/services/${selectedService.id}`, payload)
        showSuccess('Service updated')
      } else {
        await api.post('/api/v1/merchant/salon/services', payload)
        showSuccess('Service created')
      }
      await fetchCategories()
      setViewMode('list')
    } catch (err: any) { setError(err.message || 'Failed to save service') }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm('Delete this service and all its add-ons?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/services/${id}`)
      showSuccess('Service deleted')
      await fetchCategories()
      if (viewMode !== 'list') setViewMode('list')
    } catch (err: any) { setError(err.message || 'Failed to delete service') }
  }

  const handleToggleService = async (service: SvcService) => {
    if (!service.id) return
    const newActive = !isServiceActive(service)
    try {
      await api.put(`/api/v1/merchant/salon/services/${service.id}`, { isActive: newActive })
      showSuccess(newActive ? 'Service enabled' : 'Service paused')
      await fetchCategories()
      // Update detail view if open
      if (selectedService?.id === service.id) {
        setSelectedService({ ...service, isActive: newActive })
      }
    } catch (err: any) { setError(err.message || 'Failed to update service') }
  }

  // ============ ADDON HANDLERS ============

  const handleSaveAddon = async () => {
    if (!selectedService?.id) return
    const { name, price, duration } = addonForm
    if (!name.trim() || !price || !duration) { setError('All add-on fields are required'); return }
    try {
      if (editingAddon?.id) {
        await api.put(`/api/v1/merchant/salon/service-addons/${editingAddon.id}`, {
          name: name.trim(), price: parseFloat(price), duration: parseInt(duration)
        })
        showSuccess('Add-on updated')
      } else {
        await api.post(`/api/v1/merchant/salon/services/${selectedService.id}/addons`, {
          name: name.trim(), price: parseFloat(price), duration: parseInt(duration)
        })
        showSuccess('Add-on added')
      }
      setAddonForm({ name: '', price: '', duration: '' })
      setEditingAddon(null)
      setShowAddonForm(false)
      await fetchCategories()
    } catch (err: any) { setError(err.message || 'Failed to save add-on') }
  }

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('Delete this add-on?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/service-addons/${id}`)
      showSuccess('Add-on deleted')
      await fetchCategories()
    } catch (err: any) { setError(err.message || 'Failed to delete add-on') }
  }

  const openAddonEdit = (addon?: SvcAddon) => {
    if (addon) {
      setEditingAddon(addon)
      setAddonForm({ name: addon.name, price: addon.price.toString(), duration: addon.duration.toString() })
    } else {
      setEditingAddon(null)
      setAddonForm({ name: '', price: '', duration: '' })
    }
    setShowAddonForm(true)
  }

  // ============ HELPER: find service's fresh data after refetch ============
  const findServiceById = (id: string): SvcService | null => {
    for (const cat of categories) {
      const svc = cat.services?.find(s => s.id === id)
      if (svc) return svc
    }
    return null
  }

  // Keep selectedService in sync after fetches
  useEffect(() => {
    if (selectedService?.id) {
      const fresh = findServiceById(selectedService.id)
      if (fresh) setSelectedService(fresh)
    }
  }, [categories])

  // ============ RENDER: LOADING ============

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading services...</p>
        </div>
      </div>
    )
  }

  // ============ RENDER: ALERTS ============

  const AlertBanner = () => (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}
    </>
  )

  // ============ RENDER: LIST VIEW (Card Grid) ============

  const renderListView = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Services</h2>
          <p className="text-sm text-gray-500 mt-1">
            {categories.reduce((sum, c) => sum + (c.services?.length || 0), 0)} services in {categories.length} categories
          </p>
        </div>
        <button
          onClick={() => openCategoryForm()}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2.5 px-5 rounded-lg transition-colors"
        >
          + New Category
        </button>
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-4">💇</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No services yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create your first category to start adding services</p>
          <button
            onClick={() => openCategoryForm()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            Create Category
          </button>
        </div>
      )}

      {/* Categories with Card Grid */}
      {categories.map((category) => (
        <div key={category.id} className="space-y-4">
          {/* Category Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-800">{category.name}</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {category.services?.length || 0} services
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openCategoryForm(category)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Edit category"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => category.id && handleDeleteCategory(category.id)}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete category"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => category.id && openServiceEdit(category.id)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-1.5 px-3.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <span>+</span> Add Service
              </button>
            </div>
          </div>

          {/* Service Cards Grid */}
          {category.services && category.services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.services.map((service) => (
                <div
                  key={service.id}
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer group hover:shadow-lg hover:border-purple-200 transition-all duration-200 ${
                    !isServiceActive(service) ? 'opacity-70' : ''
                  }`}
                  onClick={() => openServiceDetail(service)}
                >
                  {/* Cover Image */}
                  <div className="relative h-40 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden">
                    {service.coverImageUrl ? (
                      <img
                        src={service.coverImageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-40">💆</span>
                      </div>
                    )}
                    {/* Paused Badge */}
                    {!isServiceActive(service) && (
                      <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        Paused
                      </div>
                    )}
                    {/* Addon Count Badge */}
                    {service.addons && service.addons.length > 0 && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-purple-700 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                        {service.addons.length} add-on{service.addons.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-800 group-hover:text-purple-700 transition-colors truncate">
                      {service.name}
                    </h4>
                    {service.description && (
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-purple-600 font-bold">${service.price.toFixed(2)}</span>
                        <span className="text-gray-400 text-sm flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {service.duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
              <p className="text-gray-400 text-sm">No services in this category</p>
              <button
                onClick={() => category.id && openServiceEdit(category.id)}
                className="text-purple-600 hover:text-purple-700 text-sm font-semibold mt-2"
              >
                + Add your first service
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add Category Button (bottom) */}
      {categories.length > 0 && (
        <button
          onClick={() => openCategoryForm()}
          className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-purple-600 hover:border-purple-300 transition-colors text-sm font-semibold"
        >
          + Add Service Category
        </button>
      )}
    </div>
  )

  // ============ RENDER: DETAIL VIEW (Two-Column) ============

  const renderDetailView = () => {
    if (!selectedService) return null

    const category = categories.find(c => c.services?.some(s => s.id === selectedService.id))

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setViewMode('list')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Services
        </button>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Image */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 h-64">
              {selectedService.coverImageUrl ? (
                <img
                  src={selectedService.coverImageUrl}
                  alt={selectedService.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl opacity-30">💆</span>
                </div>
              )}
              {!isServiceActive(selectedService) && (
                <div className="absolute top-4 left-4 bg-orange-500 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                  Paused
                </div>
              )}
            </div>

            {/* Service Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedService.name}</h2>
                  {category && (
                    <span className="inline-block mt-2 text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                      {category.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openServiceEdit(category?.id || '', selectedService)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Edit Service
                </button>
              </div>

              {selectedService.description && (
                <p className="text-gray-600 mt-4 leading-relaxed">{selectedService.description}</p>
              )}

              <div className="flex items-center gap-6 mt-5 pt-5 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Price</p>
                  <p className="text-xl font-bold text-purple-600 mt-1">${selectedService.price.toFixed(2)}</p>
                </div>
                <div className="w-px h-10 bg-gray-200"></div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Duration</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{selectedService.duration} min</p>
                </div>
              </div>
            </div>

            {/* Add-ons Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Add-ons</h3>
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">
                  Overlay Mode
                </span>
              </div>

              {selectedService.addons && selectedService.addons.length > 0 ? (
                <div className="space-y-3">
                  {selectedService.addons.map((addon, index) => (
                    <div key={addon.id || `addon-${index}`} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-700">{addon.name}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="text-purple-600 font-semibold">+${addon.price.toFixed(2)}</span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span>{addon.duration} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm py-4 text-center">No add-ons configured</p>
              )}
            </div>
          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Service Status</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${isServiceActive(selectedService) ? 'text-green-600' : 'text-orange-500'}`}>
                    {isServiceActive(selectedService) ? 'Active' : 'Paused'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isServiceActive(selectedService)
                      ? 'Visible to customers'
                      : 'Hidden from booking page'}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleService(selectedService)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isServiceActive(selectedService) ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isServiceActive(selectedService) ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Staff Team */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Staff Team</h3>
              {staff.filter(s => s.isActive).length > 0 ? (
                <div className="space-y-2">
                  {staff.filter(s => s.isActive).map((member) => (
                    <div key={member.id} className="flex items-center gap-3 py-2">
                      <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {(member.firstName || '?')[0]}{(member.lastName || '?')[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-gray-400 capitalize">{member.role.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No active staff members</p>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-100 p-6">
              <h3 className="text-sm font-bold text-red-600 mb-3">Danger Zone</h3>
              <p className="text-xs text-gray-500 mb-3">Permanently delete this service and all its add-ons.</p>
              <button
                onClick={() => selectedService.id && handleDeleteService(selectedService.id)}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold py-2 px-4 rounded-lg transition-colors border border-red-200"
              >
                Delete Service
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============ RENDER: EDIT VIEW (Full Page Form) ============

  const renderEditView = () => {
    const isNew = !selectedService?.id

    return (
      <div className="space-y-6 max-w-3xl">
        {/* Back Button */}
        <button
          onClick={() => {
            if (selectedService?.id) {
              setViewMode('detail')
            } else {
              setViewMode('list')
            }
          }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isNew ? 'Back to Services' : 'Back to Service Detail'}
        </button>

        <h2 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Create New Service' : `Edit: ${selectedService?.name}`}
        </h2>

        {/* Basic Info Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-base font-bold text-gray-800 pb-3 border-b border-gray-100">Basic Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Name *</label>
            <input
              type="text"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              placeholder="e.g. Classic Manicure"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              placeholder="Describe this service..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
            <select
              value={serviceForm.categoryId}
              onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cover Image URL</label>
            <input
              type="url"
              value={serviceForm.coverImageUrl}
              onChange={(e) => setServiceForm({ ...serviceForm, coverImageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {serviceForm.coverImageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 h-32 bg-gray-50">
                <img src={serviceForm.coverImageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
          </div>
        </div>

        {/* Price & Duration Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-base font-bold text-gray-800 pb-3 border-b border-gray-100">Price & Duration</h3>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (min) *</label>
              <input
                type="number"
                min="1"
                value={serviceForm.duration}
                onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                placeholder="60"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Add-ons Section (only visible when editing existing service) */}
        {selectedService?.id && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-800">Add-on Options</h3>
                <p className="text-xs text-gray-400 mt-0.5">Overlay mode — adds to base price</p>
              </div>
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">
                Overlay Mode
              </span>
            </div>

            {/* Existing Addons */}
            {selectedService.addons && selectedService.addons.length > 0 && (
              <div className="space-y-2">
                {selectedService.addons.map((addon, index) => (
                  <div key={addon.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 group">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-700 text-sm">{addon.name}</span>
                      <span className="text-xs text-gray-400">+${addon.price.toFixed(2)} / {addon.duration}min</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openAddonEdit(addon)}
                        className="text-purple-600 hover:text-purple-800 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => addon.id && handleDeleteAddon(addon.id)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline Addon Form */}
            {showAddonForm ? (
              <div className="bg-purple-50 rounded-lg p-4 space-y-3 border border-purple-100">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Add-on Name *</label>
                  <input
                    type="text"
                    value={addonForm.name}
                    onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                    placeholder="e.g. Hot Stone"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={addonForm.price}
                      onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min) *</label>
                    <input
                      type="number"
                      value={addonForm.duration}
                      onChange={(e) => setAddonForm({ ...addonForm, duration: e.target.value })}
                      placeholder="15"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setShowAddonForm(false); setEditingAddon(null); setAddonForm({ name: '', price: '', duration: '' }) }}
                    className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAddon}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {editingAddon ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openAddonEdit()}
                className="w-full py-3 border-2 border-dashed border-purple-200 rounded-lg text-purple-500 hover:text-purple-700 hover:border-purple-400 transition-colors text-sm font-semibold"
              >
                + Add Option
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 pb-6">
          <button
            onClick={() => {
              if (selectedService?.id) setViewMode('detail')
              else setViewMode('list')
            }}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveService}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isNew ? 'Create Service' : 'Save Changes'}
          </button>
        </div>
      </div>
    )
  }

  // ============ MAIN RENDER ============

  return (
    <div className="space-y-4">
      <AlertBanner />

      {viewMode === 'list' && renderListView()}
      {viewMode === 'detail' && renderDetailView()}
      {viewMode === 'edit' && renderEditView()}

      {/* Category Modal (shared across views) */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingCategory ? 'Edit Category' : 'New Category'}
            </h3>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
              placeholder="Category name"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCategoryForm(false); setEditingCategory(null); setCategoryName('') }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesManager
