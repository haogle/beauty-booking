import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

interface Addon {
  id?: string
  name: string
  price: number
  duration: number
}

interface Service {
  id?: string
  name: string
  description?: string
  price: number
  duration: number
  categoryId?: string
  addons?: Addon[]
}

interface ServiceCategory {
  id?: string
  name: string
  services?: Service[]
}

interface CategoriesData {
  categories?: ServiceCategory[]
}

export const ServicesPage: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal state
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')

  // Form states
  const [categoryName, setCategoryName] = useState('')
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    categoryId: '',
  })
  const [addonForm, setAddonForm] = useState({
    name: '',
    price: '',
    duration: '',
  })

  // Fetch categories and services
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/merchant/salon/services')
      const result = response.data?.data || response.data
      const data = result as CategoriesData
      setCategories(data.categories || [])
      setError('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load services')
      }
    } finally {
      setLoading(false)
    }
  }

  // Category handlers
  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      setError('Category name is required')
      return
    }
    try {
      await api.post('/api/v1/merchant/salon/service-categories', { name: categoryName })
      setCategoryName('')
      setShowCategoryForm(false)
      setSuccess('Category added successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to add category')
      }
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory?.id || !categoryName.trim()) {
      setError('Category name is required')
      return
    }
    try {
      await api.put(`/api/v1/merchant/salon/service-categories/${editingCategory.id}`, {
        name: categoryName,
      })
      setCategoryName('')
      setEditingCategory(null)
      setShowCategoryForm(false)
      setSuccess('Category updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update category')
      }
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/service-categories/${id}`)
      setSuccess('Category deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete category')
      }
    }
  }

  // Service handlers
  const handleAddService = async () => {
    const { name, description, price, duration, categoryId } = serviceForm
    if (!name.trim() || !price || !duration || !categoryId) {
      setError('All service fields are required')
      return
    }
    try {
      await api.post('/api/v1/merchant/salon/services', {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        duration: parseInt(duration),
        categoryId,
      })
      setServiceForm({ name: '', description: '', price: '', duration: '', categoryId: '' })
      setShowServiceModal(false)
      setSuccess('Service added successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to add service')
      }
    }
  }

  const handleEditService = async () => {
    if (!editingService?.id) return
    const { name, description, price, duration, categoryId } = serviceForm
    if (!name.trim() || !price || !duration || !categoryId) {
      setError('All service fields are required')
      return
    }
    try {
      await api.put(`/api/v1/merchant/salon/services/${editingService.id}`, {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        duration: parseInt(duration),
        categoryId,
      })
      setServiceForm({ name: '', description: '', price: '', duration: '', categoryId: '' })
      setEditingService(null)
      setShowServiceModal(false)
      setSuccess('Service updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update service')
      }
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/services/${id}`)
      setSuccess('Service deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete service')
      }
    }
  }

  // Addon handlers
  const handleAddAddon = async () => {
    if (!selectedServiceId) {
      setError('No service selected')
      return
    }
    const { name, price, duration } = addonForm
    if (!name.trim() || !price || !duration) {
      setError('All addon fields are required')
      return
    }
    try {
      await api.post(`/api/v1/merchant/salon/services/${selectedServiceId}/addons`, {
        name: name.trim(),
        price: parseFloat(price),
        duration: parseInt(duration),
      })
      setAddonForm({ name: '', price: '', duration: '' })
      setShowAddonModal(false)
      setSuccess('Add-on added successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to add add-on')
      }
    }
  }

  const handleEditAddon = async () => {
    if (!editingAddon?.id) return
    const { name, price, duration } = addonForm
    if (!name.trim() || !price || !duration) {
      setError('All addon fields are required')
      return
    }
    try {
      await api.put(`/api/v1/merchant/salon/service-addons/${editingAddon.id}`, {
        name: name.trim(),
        price: parseFloat(price),
        duration: parseInt(duration),
      })
      setAddonForm({ name: '', price: '', duration: '' })
      setEditingAddon(null)
      setShowAddonModal(false)
      setSuccess('Add-on updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update add-on')
      }
    }
  }

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this add-on?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/service-addons/${id}`)
      setSuccess('Add-on deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      await fetchCategories()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete add-on')
      }
    }
  }

  const openCategoryForm = (category?: ServiceCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryName(category.name)
    } else {
      setCategoryName('')
      setEditingCategory(null)
    }
    setShowCategoryForm(true)
  }

  const openServiceModal = (categoryId: string, service?: Service) => {
    if (service) {
      setEditingService(service)
      setServiceForm({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration: service.duration.toString(),
        categoryId: service.categoryId || categoryId,
      })
    } else {
      setServiceForm({ name: '', description: '', price: '', duration: '', categoryId })
      setEditingService(null)
    }
    setShowServiceModal(true)
  }

  const openAddonModal = (serviceId: string, addon?: Addon) => {
    if (addon) {
      setEditingAddon(addon)
      setAddonForm({
        name: addon.name,
        price: addon.price.toString(),
        duration: addon.duration.toString(),
      })
    } else {
      setAddonForm({ name: '', price: '', duration: '' })
      setEditingAddon(null)
    }
    setSelectedServiceId(serviceId)
    setShowAddonModal(true)
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading services...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Services Management</h2>
          <button
            onClick={() => openCategoryForm()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Add Category
          </button>
        </div>

        {/* Categories and Services */}
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">{category.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => openCategoryForm(category)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => category.id && handleDeleteCategory(category.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => category.id && openServiceModal(category.id)}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded transition-colors"
                  >
                    Add Service
                  </button>
                </div>
              </div>

              {/* Services Table */}
              {category.services && category.services.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">Name</th>
                        <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                        <th className="text-right px-4 py-2 font-semibold text-gray-700">Price</th>
                        <th className="text-center px-4 py-2 font-semibold text-gray-700">Duration (min)</th>
                        <th className="text-center px-4 py-2 font-semibold text-gray-700">Add-ons</th>
                        <th className="text-center px-4 py-2 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.services.map((service) => (
                        <tr key={service.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-800">{service.name}</td>
                          <td className="px-4 py-3 text-gray-600">{service.description || '-'}</td>
                          <td className="px-4 py-3 text-right text-gray-700 font-semibold">
                            ${service.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">{service.duration}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                              {service.addons?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => service.id && openServiceModal(category.id || '', service)}
                                className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => service.id && handleDeleteService(service.id)}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">No services in this category</p>
              )}

              {/* Add-ons Section */}
              {category.services && category.services.length > 0 && (
                <div className="mt-6 border-t pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Add-ons</h4>
                  {category.services.some((s) => s.addons && s.addons.length > 0) ? (
                    <div className="space-y-3">
                      {category.services.map((service) =>
                        service.addons && service.addons.length > 0 ? (
                          <div key={service.id} className="bg-gray-50 p-3 rounded">
                            <p className="font-semibold text-gray-700 text-sm mb-2">{service.name}</p>
                            <div className="space-y-2">
                              {service.addons.map((addon) => (
                                <div
                                  key={addon.id}
                                  className="flex justify-between items-center bg-white p-2 rounded border border-gray-200"
                                >
                                  <div>
                                    <p className="font-semibold text-gray-700 text-sm">{addon.name}</p>
                                    <p className="text-xs text-gray-500">
                                      ${addon.price.toFixed(2)} | {addon.duration} min
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => service.id && addon.id && openAddonModal(service.id, addon)}
                                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => addon.id && handleDeleteAddon(addon.id)}
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => service.id && openAddonModal(service.id)}
                              className="mt-2 bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded transition-colors"
                            >
                              Add Add-on
                            </button>
                          </div>
                        ) : null,
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">No add-ons added yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Category Form Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Hair Services"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCategoryForm(false)
                    setEditingCategory(null)
                    setCategoryName('')
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingCategory ? handleEditCategory : handleAddCategory}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {editingCategory ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Service Modal */}
        {showServiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 my-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Service Name *</label>
                  <input
                    type="text"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Haircut"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Description</label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Service description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Duration (minutes) *</label>
                  <input
                    type="number"
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Category *</label>
                  <select
                    value={serviceForm.categoryId}
                    onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowServiceModal(false)
                    setEditingService(null)
                    setServiceForm({ name: '', description: '', price: '', duration: '', categoryId: '' })
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingService ? handleEditService : handleAddService}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {editingService ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Addon Modal */}
        {showAddonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {editingAddon ? 'Edit Add-on' : 'Add Add-on'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Add-on Name *</label>
                  <input
                    type="text"
                    value={addonForm.name}
                    onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Color Treatment"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={addonForm.price}
                    onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Duration (minutes) *</label>
                  <input
                    type="number"
                    value={addonForm.duration}
                    onChange={(e) => setAddonForm({ ...addonForm, duration: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddonModal(false)
                    setEditingAddon(null)
                    setAddonForm({ name: '', price: '', duration: '' })
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingAddon ? handleEditAddon : handleAddAddon}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {editingAddon ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
