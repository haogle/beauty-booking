import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Layout } from '../components/Layout'

// ========== TYPES ==========
interface GiftCardCategory {
  id: string
  name: string
  sortOrder: number
}

interface GiftCardProductItem {
  id?: string
  serviceId: string
  serviceName: string
  servicePrice: number
  quantity: number
}

interface GiftCardProduct {
  id: string
  name: string
  type: 'AMOUNT' | 'ITEM'
  categoryId: string | null
  price: number
  faceValue: number | null
  coverImageUrl: string | null
  fontColor: string
  validityDays: number | null
  isListed: boolean
  items: GiftCardProductItem[]
}

interface IssuedCard {
  id: string
  serialNo: string
  productName: string
  productType: string
  recipientName: string | null
  recipientPhone: string | null
  originalValue: number
  remainingValue: number
  remainingItems: any[]
  status: string
  issuedAt: string
  expiresAt: string | null
}

interface CardDetail {
  id: string
  serialNo: string
  productName: string
  productType: string
  recipientName: string | null
  recipientPhone: string | null
  originalValue: number
  remainingValue: number
  remainingItems: any[]
  status: string
  issuedAt: string
  expiresAt: string | null
  senderName: string | null
  message: string | null
  redemptionLogs: any[]
}

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string
}

type TabType = 'products' | 'issue' | 'redeem' | 'manage'

export const GiftCardsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('products')
  const [error, setError] = useState('')

  const tabs: { key: TabType; label: string }[] = [
    { key: 'products', label: 'Gift Card Products' },
    { key: 'issue', label: 'Issue Card' },
    { key: 'redeem', label: 'Redeem' },
    { key: 'manage', label: 'Manage Cards' },
  ]

  return (
    <Layout>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'products' && <ProductsTab setError={setError} />}
        {activeTab === 'issue' && <IssueTab setError={setError} />}
        {activeTab === 'redeem' && <RedeemTab setError={setError} />}
        {activeTab === 'manage' && <ManageTab setError={setError} />}
      </div>
    </Layout>
  )
}

// ========== PRODUCTS TAB ==========
const ProductsTab: React.FC<{ setError: (e: string) => void }> = ({ setError }) => {
  const [categories, setCategories] = useState<GiftCardCategory[]>([])
  const [products, setProducts] = useState<GiftCardProduct[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<GiftCardProduct | null>(null)
  const [editingCategory, setEditingCategory] = useState<GiftCardCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')

  // Product form state
  const [pForm, setPForm] = useState({
    name: '', type: 'AMOUNT' as 'AMOUNT' | 'ITEM', categoryId: '',
    price: '', faceValue: '', fontColor: '#FFFFFF', validityDays: '',
    coverImageUrl: '',
  })
  const [productItems, setProductItems] = useState<{ serviceId: string; quantity: number }[]>([])

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [catRes, prodRes, svcRes] = await Promise.all([
        api.get('/api/v1/merchant/salon/gift-card-categories'),
        api.get('/api/v1/merchant/salon/gift-card-products'),
        api.get('/api/v1/merchant/salon/services'),
      ])
      const catData = catRes.data?.data || catRes.data
      const prodData = prodRes.data?.data || prodRes.data
      const svcData = svcRes.data?.data || svcRes.data

      setCategories(Array.isArray(catData) ? catData : [])
      setProducts(Array.isArray(prodData) ? prodData : [])

      // Flatten services from categories
      const allServices: Service[] = []
      const cats = Array.isArray(svcData) ? svcData : []
      for (const cat of cats) {
        if (cat.services) {
          for (const s of cat.services) {
            allServices.push({ id: s.id, name: s.name, price: s.price, duration: s.duration })
          }
        }
      }
      setServices(allServices)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const openCreateProduct = () => {
    setEditingProduct(null)
    setPForm({ name: '', type: 'AMOUNT', categoryId: categories[0]?.id || '', price: '', faceValue: '', fontColor: '#FFFFFF', validityDays: '', coverImageUrl: '' })
    setProductItems([])
    setShowProductModal(true)
  }

  const openEditProduct = (p: GiftCardProduct) => {
    setEditingProduct(p)
    setPForm({
      name: p.name, type: p.type, categoryId: p.categoryId || '',
      price: String(p.price), faceValue: p.faceValue ? String(p.faceValue) : '',
      fontColor: p.fontColor || '#FFFFFF', validityDays: p.validityDays ? String(p.validityDays) : '',
      coverImageUrl: p.coverImageUrl || '',
    })
    setProductItems(p.items.map(i => ({ serviceId: i.serviceId, quantity: i.quantity })))
    setShowProductModal(true)
  }

  const handleSaveProduct = async () => {
    try {
      const body: any = {
        name: pForm.name,
        type: pForm.type,
        categoryId: pForm.categoryId || null,
        price: parseFloat(pForm.price) || 0,
        faceValue: pForm.faceValue ? parseFloat(pForm.faceValue) : null,
        fontColor: pForm.fontColor,
        validityDays: pForm.validityDays ? parseInt(pForm.validityDays) : null,
        coverImageUrl: pForm.coverImageUrl || null,
      }
      if (pForm.type === 'ITEM') {
        body.items = productItems.filter(i => i.serviceId)
      }

      if (editingProduct) {
        await api.put(`/api/v1/merchant/salon/gift-card-products/${editingProduct.id}`, body)
      } else {
        await api.post('/api/v1/merchant/salon/gift-card-products', body)
      }
      setShowProductModal(false)
      fetchAll()
    } catch (err: any) {
      setError(err.message || 'Failed to save product')
    }
  }

  const toggleListed = async (p: GiftCardProduct) => {
    try {
      await api.put(`/api/v1/merchant/salon/gift-card-products/${p.id}`, { isListed: !p.isListed })
      fetchAll()
    } catch (err: any) {
      setError(err.message || 'Failed to update')
    }
  }

  const deleteProduct = async (p: GiftCardProduct) => {
    if (!confirm(`Delete "${p.name}"?`)) return
    try {
      await api.delete(`/api/v1/merchant/salon/gift-card-products/${p.id}`)
      fetchAll()
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
    }
  }

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await api.put(`/api/v1/merchant/salon/gift-card-categories/${editingCategory.id}`, { name: categoryName })
      } else {
        await api.post('/api/v1/merchant/salon/gift-card-categories', { name: categoryName })
      }
      setShowCategoryModal(false)
      fetchAll()
    } catch (err: any) {
      setError(err.message || 'Failed to save category')
    }
  }

  const deleteCategory = async (cat: GiftCardCategory) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return
    try {
      await api.delete(`/api/v1/merchant/salon/gift-card-categories/${cat.id}`)
      fetchAll()
    } catch (err: any) {
      setError(err.message || 'Failed to delete category')
    }
  }

  const addProductItem = () => {
    setProductItems([...productItems, { serviceId: services[0]?.id || '', quantity: 1 }])
  }

  const getServiceName = (serviceId: string) => services.find(s => s.id === serviceId)?.name || 'Unknown'
  const getCategoryName = (catId: string | null) => categories.find(c => c.id === catId)?.name || 'Uncategorized'

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div className="space-y-4">
      {/* Categories Row */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-gray-800">Categories</h3>
          <button onClick={() => { setEditingCategory(null); setCategoryName(''); setShowCategoryModal(true); }}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1 px-3 rounded-lg">
            + Add Category
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <p className="text-gray-400 text-sm">No categories yet</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                <button onClick={() => { setEditingCategory(cat); setCategoryName(cat.name); setShowCategoryModal(true); }}
                  className="text-blue-500 hover:text-blue-700 text-xs ml-1">Edit</button>
                <button onClick={() => deleteCategory(cat)}
                  className="text-red-500 hover:text-red-700 text-xs">Del</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Products List */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Gift Card Products ({products.length})</h3>
        <button onClick={openCreateProduct}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">
          + New Gift Card
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-400 text-lg">No gift card products yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Card Preview */}
              <div
                className="h-36 relative flex flex-col justify-end p-4"
                style={{
                  backgroundColor: p.coverImageUrl ? undefined : '#374151',
                  backgroundImage: p.coverImageUrl ? `url(${p.coverImageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: p.fontColor || '#FFFFFF',
                }}
              >
                <div className="absolute top-2 right-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    p.isListed ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    {p.isListed ? 'Listed' : 'Unlisted'}
                  </span>
                </div>
                <p className="text-xs opacity-80">{p.type === 'AMOUNT' ? 'Amount Card' : 'Item Card'}</p>
                <p className="text-xl font-bold">{p.name}</p>
                {p.type === 'AMOUNT' ? (
                  <p className="text-2xl font-bold">${Number(p.faceValue || p.price).toFixed(0)}</p>
                ) : (
                  <p className="text-sm">
                    {p.items.length > 0 ? p.items.map(i => `${i.serviceName} x${i.quantity}`).join(', ') : 'No items'}
                  </p>
                )}
                {p.validityDays && <p className="text-xs opacity-70 mt-1">Valid {p.validityDays} days</p>}
              </div>

              {/* Card Info */}
              <div className="p-4">
                <div className="flex justify-between text-sm text-gray-600 mb-3">
                  <span>Price: ${Number(p.price).toFixed(2)}</span>
                  <span>{getCategoryName(p.categoryId)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleListed(p)}
                    className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition-colors ${
                      p.isListed
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}>
                    {p.isListed ? 'Unlist' : 'List'}
                  </button>
                  <button onClick={() => openEditProduct(p)}
                    className="flex-1 text-sm font-semibold py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg">
                    Edit
                  </button>
                  <button onClick={() => deleteProduct(p)}
                    className="text-sm font-semibold py-1.5 px-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg">
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <input value={categoryName} onChange={e => setCategoryName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Category name" />
            <div className="flex gap-3">
              <button onClick={() => setShowCategoryModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg">Cancel</button>
              <button onClick={saveCategory} disabled={!categoryName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editingProduct ? 'Edit Gift Card' : 'New Gift Card'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Gift card name" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={pForm.type} onChange={e => setPForm({ ...pForm, type: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="AMOUNT">Amount Card</option>
                    <option value="ITEM">Item Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={pForm.categoryId} onChange={e => setPForm({ ...pForm, categoryId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
                  <input type="number" value={pForm.price} onChange={e => setPForm({ ...pForm, price: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>
                {pForm.type === 'AMOUNT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Face Value</label>
                    <input type="number" value={pForm.faceValue} onChange={e => setPForm({ ...pForm, faceValue: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validity (days)</label>
                  <input type="number" value={pForm.validityDays} onChange={e => setPForm({ ...pForm, validityDays: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Leave empty = never expires" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Font Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={pForm.fontColor} onChange={e => setPForm({ ...pForm, fontColor: e.target.value })}
                      className="w-10 h-10 rounded border cursor-pointer" />
                    <input value={pForm.fontColor} onChange={e => setPForm({ ...pForm, fontColor: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                <input value={pForm.coverImageUrl} onChange={e => setPForm({ ...pForm, coverImageUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
              </div>

              {/* Item Card Services */}
              {pForm.type === 'ITEM' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Services (Items)</label>
                    <button onClick={addProductItem}
                      className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg font-medium">+ Add Service</button>
                  </div>
                  {productItems.length === 0 && <p className="text-gray-400 text-sm">No services added</p>}
                  {productItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <select value={item.serviceId}
                        onChange={e => {
                          const newItems = [...productItems]
                          newItems[idx].serviceId = e.target.value
                          setProductItems(newItems)
                        }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                      </select>
                      <input type="number" min="1" value={item.quantity}
                        onChange={e => {
                          const newItems = [...productItems]
                          newItems[idx].quantity = parseInt(e.target.value) || 1
                          setProductItems(newItems)
                        }}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center" />
                      <button onClick={() => setProductItems(productItems.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-sm font-bold px-2">X</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowProductModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg">Cancel</button>
              <button onClick={handleSaveProduct} disabled={!pForm.name.trim() || !pForm.price}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg">
                {editingProduct ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== ISSUE TAB ==========
const IssueTab: React.FC<{ setError: (e: string) => void }> = ({ setError }) => {
  const [products, setProducts] = useState<GiftCardProduct[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [buyerClientId, setBuyerClientId] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [issuedCard, setIssuedCard] = useState<any>(null)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [prodRes, clientRes] = await Promise.all([
        api.get('/api/v1/merchant/salon/gift-card-products'),
        api.get('/api/v1/merchant/salon/clients?limit=200'),
      ])
      const prodData = prodRes.data?.data || prodRes.data
      const clientData = clientRes.data?.data || clientRes.data
      const allProds = Array.isArray(prodData) ? prodData : []
      setProducts(allProds.filter((p: any) => p.isListed))
      setClients(clientData.clients || (Array.isArray(clientData) ? clientData : []))
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleIssue = async () => {
    if (!selectedProductId || !recipientPhone) {
      setError('Please select a product and enter recipient phone')
      return
    }
    try {
      setIssuing(true)
      const res = await api.post('/api/v1/merchant/salon/gift-cards/issue', {
        productId: selectedProductId,
        recipientPhone,
        recipientName: recipientName || undefined,
        senderName: senderName || undefined,
        message: message || undefined,
        buyerClientId: buyerClientId || undefined,
      })
      const result = res.data?.data || res.data
      setIssuedCard(result)
      setRecipientPhone('')
      setRecipientName('')
      setSenderName('')
      setMessage('')
      setBuyerClientId('')
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to issue')
    } finally {
      setIssuing(false)
    }
  }

  const selectClient = (client: Client) => {
    setBuyerClientId(client.id)
    setRecipientPhone(client.phone || '')
    setRecipientName(`${client.firstName} ${client.lastName}`.trim())
    setShowClientPicker(false)
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const filteredClients = clientSearch
    ? clients.filter(c => `${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(clientSearch.toLowerCase()))
    : clients

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {issuedCard ? (
        <div className="bg-white rounded-lg shadow p-6 text-center space-y-4">
          <div className="text-green-500 text-5xl">&#10003;</div>
          <h3 className="text-xl font-bold text-gray-800">Gift Card Issued!</h3>
          <div className="bg-gray-100 rounded-lg p-4">
            <p className="text-sm text-gray-600">Serial Number</p>
            <p className="text-2xl font-mono font-bold text-gray-800">{issuedCard.serialNo}</p>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Product: <strong>{issuedCard.productName}</strong></p>
            <p>Recipient: <strong>{issuedCard.recipientName || issuedCard.recipientPhone}</strong></p>
            <p>Value: <strong>${Number(issuedCard.originalValue).toFixed(2)}</strong></p>
            {issuedCard.expiresAt && <p>Expires: <strong>{issuedCard.expiresAt}</strong></p>}
          </div>
          <button onClick={() => setIssuedCard(null)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg">
            Issue Another
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Issue Gift Card</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Gift Card Product *</label>
            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Select a product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - ${p.price} ({p.type === 'AMOUNT' ? `$${p.faceValue || p.price} value` : 'Item Card'})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-gray-600">
                {selectedProduct.type === 'AMOUNT'
                  ? `Face Value: $${selectedProduct.faceValue || selectedProduct.price}`
                  : `Items: ${selectedProduct.items.map(i => `${i.serviceName} x${i.quantity}`).join(', ')}`}
              </p>
              {selectedProduct.validityDays && <p className="text-gray-600">Valid for {selectedProduct.validityDays} days</p>}
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Recipient Info</label>
              <button onClick={() => setShowClientPicker(true)}
                className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg font-medium">
                Select Customer
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone (required) *</label>
                <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Recipient name" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Buyer / Sender Name</label>
                <input value={senderName} onChange={e => setSenderName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sender name" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Gift message..." />
              </div>
            </div>
          </div>

          <button onClick={handleIssue} disabled={issuing || !selectedProductId || !recipientPhone}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg text-lg">
            {issuing ? 'Issuing...' : 'Confirm & Send'}
          </button>
        </div>
      )}

      {/* Client Picker Modal */}
      {showClientPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[70vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-3">Select Customer</h3>
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name or phone..." />
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredClients.map(c => (
                <button key={c.id} onClick={() => selectClient(c)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg text-sm">
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                  <span className="text-gray-500 ml-2">{c.phone}</span>
                </button>
              ))}
              {filteredClients.length === 0 && <p className="text-gray-400 text-center py-4">No customers found</p>}
            </div>
            <button onClick={() => setShowClientPicker(false)}
              className="w-full mt-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== REDEEM TAB ==========
const RedeemTab: React.FC<{ setError: (e: string) => void }> = ({ setError }) => {
  const [serialInput, setSerialInput] = useState('')
  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemNotes, setRedeemNotes] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  const lookupCard = async () => {
    if (!serialInput.trim()) return
    try {
      setLoading(true)
      const res = await api.get(`/api/v1/merchant/salon/gift-cards/${serialInput.trim()}`)
      const result = res.data?.data || res.data
      setCardDetail(result)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gift card not found')
      setCardDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRedeemAmount = async () => {
    if (!cardDetail || !redeemAmount) return
    if (!confirm(`Redeem $${redeemAmount} from card ${cardDetail.serialNo}?`)) return
    try {
      setRedeeming(true)
      const res = await api.post('/api/v1/merchant/salon/gift-cards/redeem', {
        serialNo: cardDetail.serialNo,
        redemptionType: 'AMOUNT',
        amount: parseFloat(redeemAmount),
        notes: redeemNotes || undefined,
      })
      setCardDetail(res.data?.data || res.data)
      setRedeemAmount('')
      setRedeemNotes('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Redemption failed')
    } finally {
      setRedeeming(false)
    }
  }

  const handleRedeemItem = async (serviceId: string, quantity: number) => {
    if (!cardDetail) return
    if (!confirm(`Redeem ${quantity} item(s)?`)) return
    try {
      setRedeeming(true)
      const res = await api.post('/api/v1/merchant/salon/gift-cards/redeem', {
        serialNo: cardDetail.serialNo,
        redemptionType: 'ITEM',
        serviceId,
        itemQuantity: quantity,
        notes: redeemNotes || undefined,
      })
      setCardDetail(res.data?.data || res.data)
      setRedeemNotes('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Redemption failed')
    } finally {
      setRedeeming(false)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    USED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Redeem Gift Card</h3>
        <div className="flex gap-2">
          <input value={serialInput} onChange={e => setSerialInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookupCard()}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter gift card serial number..." />
          <button onClick={lookupCard} disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg">
            {loading ? '...' : 'Lookup'}
          </button>
        </div>
      </div>

      {cardDetail && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold font-mono text-gray-800">{cardDetail.serialNo}</p>
              <p className="text-gray-600">{cardDetail.productName}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[cardDetail.status] || 'bg-gray-100'}`}>
              {cardDetail.status}
            </span>
          </div>

          {/* Balance Info */}
          {cardDetail.productType === 'AMOUNT' ? (
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600">Remaining Balance</p>
              <p className="text-4xl font-bold text-blue-700">${Number(cardDetail.remainingValue).toFixed(2)}</p>
              <p className="text-xs text-blue-500">of ${Number(cardDetail.originalValue).toFixed(2)} original</p>
            </div>
          ) : (
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium mb-2">Remaining Items</p>
              {cardDetail.remainingItems.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1">
                  <span className="text-gray-800">{item.serviceName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-700">{item.remainingQuantity} / {item.totalQuantity}</span>
                    {cardDetail.status === 'ACTIVE' && item.remainingQuantity > 0 && (
                      <button onClick={() => handleRedeemItem(item.serviceId, 1)} disabled={redeeming}
                        className="bg-purple-500 hover:bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">
                        -1
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Recipient Phone</p>
              <p className="font-medium">{cardDetail.recipientPhone || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Issued</p>
              <p className="font-medium">{new Date(cardDetail.issuedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Expires</p>
              <p className="font-medium">{cardDetail.expiresAt || 'Never'}</p>
            </div>
            <div>
              <p className="text-gray-500">Recipient</p>
              <p className="font-medium">{cardDetail.recipientName || '-'}</p>
            </div>
          </div>

          {/* Redeem Amount Section */}
          {cardDetail.productType === 'AMOUNT' && cardDetail.status === 'ACTIVE' && (
            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-800 mb-2">Redeem Amount</h4>
              <div className="flex gap-2">
                <input type="number" value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2" placeholder="Amount to redeem" />
                <button onClick={handleRedeemAmount} disabled={redeeming || !redeemAmount}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg">
                  {redeeming ? '...' : 'Redeem'}
                </button>
              </div>
              <input value={redeemNotes} onChange={e => setRedeemNotes(e.target.value)}
                className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Notes (optional)" />
            </div>
          )}

          {/* Redemption History */}
          {cardDetail.redemptionLogs.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-800 mb-2">Redemption History</h4>
              <div className="space-y-2">
                {cardDetail.redemptionLogs.map((log: any) => (
                  <div key={log.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <p className="font-medium">
                        {log.redemptionType === 'AMOUNT'
                          ? `$${Number(log.amount).toFixed(2)}`
                          : `Item redeemed (x${log.itemQuantity})`}
                      </p>
                      {log.notes && <p className="text-gray-500 text-xs">{log.notes}</p>}
                    </div>
                    <span className="text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ========== MANAGE TAB ==========
const ManageTab: React.FC<{ setError: (e: string) => void }> = ({ setError }) => {
  const [cards, setCards] = useState<IssuedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => { fetchCards() }, [page, search])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('page', String(page))
      params.set('limit', '15')

      const res = await api.get(`/api/v1/merchant/salon/gift-cards/issued?${params}`)
      const result = res.data?.data || res.data
      setCards(result.cards || [])
      setTotal(result.total || 0)
      setTotalPages(result.totalPages || 1)
    } catch (err: any) {
      setError(err.message || 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    USED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by serial number, name, or phone..." />
        <span className="text-sm text-gray-500">Total: {total}</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-400 text-lg">No gift cards found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cards.map(card => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-800">{card.serialNo}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium">{card.productName}</span>
                    <span className="text-gray-400 ml-1 text-xs">({card.productType})</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {card.productType === 'AMOUNT' ? (
                      <span>${Number(card.remainingValue).toFixed(2)} / ${Number(card.originalValue).toFixed(2)}</span>
                    ) : (
                      <span className="text-xs">
                        {card.remainingItems.map((i: any) => `${i.serviceName}: ${i.remainingQuantity}/${i.totalQuantity}`).join(', ') || 'N/A'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {card.recipientName || card.recipientPhone || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{card.expiresAt || 'Never'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[card.status] || 'bg-gray-100'}`}>
                      {card.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="px-4 py-3 flex justify-between items-center border-t">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 px-3 py-1 rounded text-sm">Prev</button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 px-3 py-1 rounded text-sm">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
