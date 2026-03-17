import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import ServicesManager from '../components/ServicesManager'
import { ImageUploader, MultiImageUploader } from '../components/ImageUploader'

// ============ TYPES ============

interface NavLink {
  label: string
  href: string
  enabled: boolean
}

interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  borderRadius: string
}

interface NavbarConfig {
  logo: string
  title: string
  links: NavLink[]
}

interface HeroConfig {
  enabled: boolean
  type: string
  title: string
  subtitle: string
  backgroundImage: string
  ctaText: string
  ctaLink: string
}

interface SectionConfig {
  id: string
  type: string
  enabled: boolean
  title: string
  subtitle: string
  content?: string
  image?: string
  images?: string[]
  items?: any[]
  order: number
}

interface FooterConfig {
  enabled: boolean
  text: string
  showSocial: boolean
  socialLinks: { facebook: string; instagram: string; twitter: string; tiktok: string }
}

interface ServicePageConfig {
  layout: string
  showPrices: boolean
  showDuration: boolean
  showDescription: boolean
  coverImage: string
}

interface SeoConfig {
  title: string
  description: string
  keywords: string
  ogImage: string
}

interface WebsiteConfig {
  id: string | null
  salonId: string
  theme: ThemeConfig
  navbar: NavbarConfig
  announcement: string
  hero: HeroConfig
  sections: SectionConfig[]
  footer: FooterConfig
  servicePage: ServicePageConfig
  seo: SeoConfig
  publishedAt: string | null
  updatedAt: string | null
}

interface MediaFile {
  id: string
  filename: string
  url: string
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  createdAt: string
}

// ============ SIDEBAR TABS ============

type EditorTab = 'hero' | 'sections' | 'navbar' | 'footer' | 'services' | 'theme' | 'seo' | 'media' | 'manage-services'

interface EditorTabItem {
  id: EditorTab
  label: string
  icon: string
  group?: string
}

const EDITOR_TABS: EditorTabItem[] = [
  { id: 'hero', label: 'Hero Banner', icon: '🖼️', group: 'Website Design' },
  { id: 'sections', label: 'Page Sections', icon: '📦' },
  { id: 'navbar', label: 'Navigation', icon: '🧭' },
  { id: 'footer', label: 'Footer', icon: '📝' },
  { id: 'services', label: 'Service Page', icon: '✂️' },
  { id: 'theme', label: 'Theme & Style', icon: '🎨' },
  { id: 'seo', label: 'SEO Settings', icon: '🔍' },
  { id: 'media', label: 'Media Library', icon: '📷' },
  { id: 'manage-services', label: 'Services', icon: '💇', group: 'Service Management' },
]

// ============ MAIN COMPONENT ============

export const WebsiteEditorPage: React.FC = () => {
  const [config, setConfig] = useState<WebsiteConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<EditorTab>('hero')
  const [hasChanges, setHasChanges] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((url: string) => void) | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchConfig()
    fetchMedia()
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/merchant/salon/website-config')
      const result = response.data?.data || response.data
      setConfig(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load website config')
    } finally {
      setLoading(false)
    }
  }

  const fetchMedia = async () => {
    try {
      const response = await api.get('/api/v1/merchant/salon/media')
      const result = response.data?.data || response.data
      setMediaFiles(Array.isArray(result) ? result : [])
    } catch {
      // Media loading is non-critical
    }
  }

  const updateConfig = useCallback((updater: (prev: WebsiteConfig) => WebsiteConfig) => {
    setConfig((prev) => {
      if (!prev) return prev
      const updated = updater(prev)
      setHasChanges(true)
      return updated
    })
  }, [])

  const handleSave = async () => {
    if (!config) return
    try {
      setSaving(true)
      setError('')
      const response = await api.put('/api/v1/merchant/salon/website-config', config)
      const result = response.data?.data || response.data
      setConfig(result)
      setHasChanges(false)
      setSuccess('Changes saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!config) return
    try {
      setPublishing(true)
      setError('')
      // Save first if there are changes
      if (hasChanges) {
        await api.put('/api/v1/merchant/salon/website-config', config)
        setHasChanges(false)
      }
      const response = await api.post('/api/v1/merchant/salon/website-config/publish')
      const result = response.data?.data || response.data
      setConfig((prev) => prev ? { ...prev, publishedAt: result.publishedAt } : prev)
      setSuccess('Website published successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const openMediaPicker = (callback: (url: string) => void) => {
    setMediaPickerCallback(() => callback)
    setShowMediaPicker(true)
  }

  const handleMediaSelect = (url: string) => {
    if (mediaPickerCallback) {
      mediaPickerCallback(url)
    }
    setShowMediaPicker(false)
    setMediaPickerCallback(null)
  }

  const handleAddMedia = async (url: string, filename: string) => {
    try {
      const response = await api.post('/api/v1/merchant/salon/media', {
        filename,
        url,
        mimeType: 'image/jpeg',
        sizeBytes: 0,
      })
      const result = response.data?.data || response.data
      setMediaFiles((prev) => [result, ...prev])
    } catch (err: any) {
      setError(err.message || 'Failed to add media')
    }
  }

  const handleDeleteMedia = async (id: string) => {
    try {
      await api.delete(`/api/v1/merchant/salon/media/${id}`)
      setMediaFiles((prev) => prev.filter((m) => m.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete media')
    }
  }

  // Drag and drop for sections
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || !config) return
    const newSections = [...config.sections]
    const [moved] = newSections.splice(draggedIndex, 1)
    newSections.splice(targetIndex, 0, moved)
    // Re-assign order
    newSections.forEach((s, i) => (s.order = i))
    updateConfig((prev) => ({ ...prev, sections: newSections }))
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading website editor...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700 font-semibold">Error loading website config</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Tab Navigation */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link to="/dashboard" className="text-xs text-purple-600 hover:text-purple-800 font-medium mb-1 inline-block">&larr; Back to Admin</Link>
          <h1 className="text-lg font-bold text-gray-900">Website Editor</h1>
          <p className="text-xs text-gray-500 mt-1">
            {config.publishedAt
              ? `Published ${new Date(config.publishedAt).toLocaleDateString()}`
              : 'Not yet published'}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {EDITOR_TABS.map((tab) => (
            <div key={tab.id}>
              {tab.group && (
                <div className="px-4 pt-4 pb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tab.group}</p>
                </div>
              )}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-sm ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-purple-700 font-semibold border-r-2 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            </div>
          ))}
        </nav>

        {/* Save / Publish Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
              hasChanges
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Draft' : 'Saved'}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full py-2 px-4 rounded-lg font-semibold text-sm bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Main Editor Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Status Bar */}
        {(error || success) && (
          <div className={`px-6 py-2 text-sm font-medium ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error || success}
            <button onClick={() => { setError(''); setSuccess(''); }} className="ml-4 underline text-xs">Dismiss</button>
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {activeTab === 'hero' && (
              <HeroEditor config={config} updateConfig={updateConfig} openMediaPicker={openMediaPicker} />
            )}
            {activeTab === 'sections' && (
              <SectionsEditor
                config={config}
                updateConfig={updateConfig}
                openMediaPicker={openMediaPicker}
                dragOverIndex={dragOverIndex}
                draggedIndex={draggedIndex}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            )}
            {activeTab === 'navbar' && (
              <NavbarEditor config={config} updateConfig={updateConfig} openMediaPicker={openMediaPicker} />
            )}
            {activeTab === 'footer' && (
              <FooterEditor config={config} updateConfig={updateConfig} />
            )}
            {activeTab === 'services' && (
              <ServicePageEditor config={config} updateConfig={updateConfig} openMediaPicker={openMediaPicker} />
            )}
            {activeTab === 'theme' && (
              <ThemeEditor config={config} updateConfig={updateConfig} />
            )}
            {activeTab === 'seo' && (
              <SeoEditor config={config} updateConfig={updateConfig} openMediaPicker={openMediaPicker} />
            )}
            {activeTab === 'media' && (
              <MediaLibrary
                files={mediaFiles}
                onAdd={handleAddMedia}
                onDelete={handleDeleteMedia}
              />
            )}
            {activeTab === 'manage-services' && (
              <ServicesManager />
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Live Preview (hidden for service management) */}
      {activeTab !== 'manage-services' && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Live Preview</h3>
            <span className="text-xs text-gray-400">Mobile</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <LivePreview config={config} />
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          files={mediaFiles}
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
          onAdd={handleAddMedia}
        />
      )}
    </div>
  )
}

// ============ HERO EDITOR ============

const HeroEditor: React.FC<{
  config: WebsiteConfig
  updateConfig: (fn: (prev: WebsiteConfig) => WebsiteConfig) => void
  openMediaPicker: (cb: (url: string) => void) => void
}> = ({ config, updateConfig, openMediaPicker }) => {
  const hero = config.hero

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Hero Banner</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hero.enabled}
            onChange={(e) =>
              updateConfig((prev) => ({ ...prev, hero: { ...prev.hero, enabled: e.target.checked } }))
            }
            className="w-4 h-4 rounded text-purple-600"
          />
          <span className="text-sm font-medium text-gray-700">Enabled</span>
        </label>
      </div>

      {/* Announcement Bar */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Bar</label>
        <input
          type="text"
          value={config.announcement}
          onChange={(e) => updateConfig((prev) => ({ ...prev, announcement: e.target.value }))}
          placeholder="e.g. 20% off all services this week!"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={hero.title}
          onChange={(e) =>
            updateConfig((prev) => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
        <input
          type="text"
          value={hero.subtitle}
          onChange={(e) =>
            updateConfig((prev) => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Background Image</label>
        <ImageUploader
          value={hero.backgroundImage}
          onChange={(url) =>
            updateConfig((prev) => ({ ...prev, hero: { ...prev.hero, backgroundImage: url } }))
          }
          shape="banner"
          placeholder="Upload hero background image"
          maxWidth={1600}
          quality={0.85}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
          <input
            type="text"
            value={hero.ctaText}
            onChange={(e) =>
              updateConfig((prev) => ({ ...prev, hero: { ...prev.hero, ctaText: e.target.value } }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
          <input
            type="text"
            value={hero.ctaLink}
            onChange={(e) =>
              updateConfig((prev) => ({ ...prev, hero: { ...prev.hero, ctaLink: e.target.value } }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}

// ============ SECTIONS EDITOR (Drag & Drop) ============

const SectionsEditor: React.FC<{
  config: WebsiteConfig
  updateConfig: (fn: (prev: WebsiteConfig) => WebsiteConfig) => void
  openMediaPicker: (cb: (url: string) => void) => void
  dragOverIndex: number | null
  draggedIndex: number | null
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (index: number) => void
  onDragEnd: () => void
}> = ({ config, updateConfig, openMediaPicker, dragOverIndex, draggedIndex, onDragStart, onDragOver, onDrop, onDragEnd }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const sortedSections = [...config.sections].sort((a, b) => a.order - b.order)

  const toggleSection = (sectionId: string, enabled: boolean) => {
    updateConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, enabled } : s)),
    }))
  }

  const updateSection = (sectionId: string, updates: Partial<SectionConfig>) => {
    updateConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
    }))
  }

  const addSection = () => {
    const id = `section_${Date.now()}`
    const newSection: SectionConfig = {
      id,
      type: 'custom',
      enabled: true,
      title: 'New Section',
      subtitle: '',
      content: '',
      order: config.sections.length,
    }
    updateConfig((prev) => ({ ...prev, sections: [...prev.sections, newSection] }))
    setExpandedSection(id)
  }

  const removeSection = (sectionId: string) => {
    updateConfig((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }))
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'services': return '✂️'
      case 'about': return '📖'
      case 'gallery': return '🖼️'
      case 'team': return '👥'
      case 'testimonials': return '⭐'
      case 'contact': return '📞'
      default: return '📦'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Page Sections</h2>
          <p className="text-sm text-gray-500 mt-1">Drag to reorder, click to edit</p>
        </div>
        <button
          onClick={addSection}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          + Add Section
        </button>
      </div>

      <div className="space-y-2">
        {sortedSections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={() => onDrop(index)}
            onDragEnd={onDragEnd}
            className={`bg-white rounded-lg border transition-all ${
              dragOverIndex === index ? 'border-purple-400 shadow-md' : 'border-gray-200'
            } ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            {/* Section Header */}
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}>
              <span className="text-gray-400 cursor-grab" title="Drag to reorder">⠿</span>
              <span className="text-lg">{getSectionIcon(section.type)}</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{section.title}</p>
                <p className="text-xs text-gray-500 capitalize">{section.type}</p>
              </div>
              <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(e) => toggleSection(section.id, e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600"
                />
              </label>
              <span className="text-gray-400 text-sm">{expandedSection === section.id ? '▲' : '▼'}</span>
            </div>

            {/* Expanded Content */}
            {expandedSection === section.id && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={section.subtitle}
                    onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {(section.type === 'about' || section.type === 'custom') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                      <textarea
                        value={section.content || ''}
                        onChange={(e) => updateSection(section.id, { content: e.target.value })}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                      <ImageUploader
                        value={section.image || ''}
                        onChange={(url) => updateSection(section.id, { image: url })}
                        shape="landscape"
                        placeholder="Upload section image"
                      />
                    </div>
                  </>
                )}

                {section.type === 'gallery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gallery Images ({(section.images || []).length})
                    </label>
                    <MultiImageUploader
                      value={section.images || []}
                      onChange={(urls) => updateSection(section.id, { images: urls })}
                      maxImages={12}
                    />
                  </div>
                )}

                {section.type === 'custom' && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeSection(section.id)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Remove Section
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ NAVBAR EDITOR ============

const NavbarEditor: React.FC<{
  config: WebsiteConfig
  updateConfig: (fn: (prev: WebsiteConfig) => WebsiteConfig) => void
  openMediaPicker: (cb: (url: string) => void) => void
}> = ({ config, updateConfig, openMediaPicker }) => {
  const navbar = config.navbar

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Navigation Bar</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
        <ImageUploader
          value={navbar.logo}
          onChange={(url) =>
            updateConfig((prev) => ({ ...prev, navbar: { ...prev.navbar, logo: url } }))
          }
          shape="square"
          placeholder="Upload logo"
          maxWidth={400}
          quality={0.9}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Site Title</label>
        <input
          type="text"
          value={navbar.title}
          onChange={(e) =>
            updateConfig((prev) => ({ ...prev, navbar: { ...prev.navbar, title: e.target.value } }))
          }
          placeholder="Your salon name"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Navigation Links</label>
        <div className="space-y-2">
          {(navbar.links || []).map((link, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <input
                type="checkbox"
                checked={link.enabled}
                onChange={(e) => {
                  const newLinks = [...(navbar.links || [])]
                  newLinks[i] = { ...link, enabled: e.target.checked }
                  updateConfig((prev) => ({ ...prev, navbar: { ...prev.navbar, links: newLinks } }))
                }}
                className="w-4 h-4 rounded text-purple-600"
              />
              <input
                type="text"
                value={link.label}
                onChange={(e) => {
                  const newLinks = [...(navbar.links || [])]
                  newLinks[i] = { ...link, label: e.target.value }
                  updateConfig((prev) => ({ ...prev, navbar: { ...prev.navbar, links: newLinks } }))
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                value={link.href}
                onChange={(e) => {
                  const newLinks = [...(navbar.links || [])]
                  newLinks[i] = { ...link, href: e.target.value }
                  updateConfig((prev) => ({ ...prev, navbar: { ...prev.navbar, links: newLinks } }))
                }}
                className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-gray-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ FOOTER EDITOR ============

const FooterEditor: React.FC<{
  config: WebsiteConfig
  updateConfig: (fn: (prev: WebsiteConfig) => WebsiteConfig) => void
}> = ({ config, updateConfig }) => {
  const footer = config.footer

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Footer</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={footer.enabled}
            onChange={(e) =>
              updateConfig((prev) => ({ ...prev, footer: { ...prev.footer, enabled: e.target.checked } }))
            }
            className="w-4 h-4 rounded text-purple-600"
          />
          <span className="text-sm font-medium text-gray-700">Enabled</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
        <textarea
          value={footer.text}
          onChange={(e) =>
            updateConfig((prev) => ({ ...prev, footer: { ...prev.footer, text: e.target.value } }))
          }
          rows={3}
          placeholder="Footer description text"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={footer.showSocial}
            onChange={(e) =>
              updateConfig((prev) => ({
                ...prev,
                footer: { ...prev.footer, showSocial: e.target.checked },
              }))
            }
            className="w-4 h-4 rounded text-purple-600"
          />
          <span className="text-sm font-medium text-gray-700">Show Social Media Links</span>
        </label>

        {footer.showSocial && (
          <div className="space-y-3">
            {(['facebook', 'instagram', 'twitter', 'tiktok'] as const).map((platform) => (
              <div key={platform}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{platform}</label>
                <input
                  type="text"
                  value={footer.socialLinks?.[platform] || ''}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        socialLinks: { ...prev.footer.socialLinks, [platform]: e.target.value },
                      },
                    }))
                  }
                  placeholder={`https://${platform}.com/yoursalon`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ SERVICE PAGE EDITOR ============

const ServicePageEditor: React.FC<{
  config: WebsiteConfig
  updateConfig: (fn: (prev: WebsiteConfig) => WebsiteConfig) => void
  openMediaPicker: (cb: (url: string) => void) => void
}> = ({ config, updateConfig, openMediaPicker }) => {
  const sp = config.servicePage

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Service Page</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Layout Style</label>
        <div className="flex gap-3">
          {['grid', 'list', 'card'].map((layout) => (
            <button
              key={layout}
              onClick={() =>
                updateConfig((prev) => ({
                  ...prev,
                  servicePage: { ...prev.servicePage, layout },
                }))
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                sp.layout === layout
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {layout}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
        <ImageUploader
          value={sp.coverImage}
          onChange={(url) =>
            updateConfig((prev) => ({
              ...prev,
              servicePage: { ...prev.servicePage, coverImage: url },
            }))
          }
          shape="banner"
          placeholder="Upload service page cover"
          maxWidth={1200}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Display Options</label>
        {[
          { key: 'showPrices', label: 'Show Prices' },
          { key: 'showDuration', label: 'Show Duration' },
          { key: 'showDescription', label: 'Show Description' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(sp as any)[key]}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  servicePage: { ...prev.servicePage, [key]: e.target.checked },
                }))
              }
              className="w-4 h-4 rounded text-purple-600"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ============ THEME EDITOR ============

const ThemeEditor: React.FC<{
  config: WebsiteConfig
  updateConfig: (fn: (prev: WebsiteConfig) => WebsiteConfig) => void
}> = ({ config, updateConfig }) => {
  const theme = config.theme

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Theme & Style</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  theme: { ...prev.theme, primaryColor: e.target.value },
                }))
              }
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  theme: { ...prev.theme, primaryColor: e.target.value },
                }))
              }
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.secondaryColor}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  theme: { ...prev.theme, secondaryColor: e.target.value },
                }))
              }
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={theme.secondaryColor}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  theme: { ...prev.theme, secondaryColor: e.target.value },
                }))
              }
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
        <select
          value={theme.fontFamily}
          onChange={(e) =>
            updateConfig((prev) => ({
              ...prev,
              theme: { ...prev.theme, fontFamily: e.target.value },
            }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="Inter">Inter</option>
          <option value="Playfair Display">Playfair Display</option>
          <option value="Poppins">Poppins</option>
          <option value="Lora">Lora</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Open Sans">Open Sans</option>
          <option value="Roboto">Roboto</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius</label>
        <select
          value={theme.borderRadius}
          onChange={(e) =>
            updateConfig((prev) => ({
              ...prev,
              theme: { ...prev.theme, borderRadius: e.target.value },
            }))
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="0px">Sharp (0px)</option>
          <option value="4px">Subtle (4px)</option>
          <option value="8px">Rounded (8px)</option>
          <option value="12px">More Rounded (12px)</option>
          <option value="16px">Very Rounded (16px)</option>
          <option value="9999px">Pill (9999px)</option>
        </select>
      </div>

      {/* Theme Preview Swatch */}
      <div className="mt-6 p-6 rounded-xl border border-gray-200" style={{ fontFamily: theme.fontFamily }}>
        <p className="text-sm text-gray-500 mb-3">Preview</p>
        <div className="flex gap-3">
          <div
            className="w-20 h-20 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
          >
            Primary
          </div>
          <div
            className="w-20 h-20 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: theme.secondaryColor, borderRadius: theme.borderRadius }}
          >
            Secondary
          </div>
        </div>
        <p className="mt-3 text-lg font-bold" style={{ fontFamily: theme.fontFamily }}>
          Sample Heading Text
        </p>
        <p className="text-sm text-gray-600" style={{ fontFamily: theme.fontFamily }}>
          This is sample body text in {theme.fontFamily}
        </p>
      </div>
    </div>
  )
}

// ============ SEO EDITOR ============

const SeoEditor: React.FC<{
  config: WebsiteConfig
  updateConfig: (fn: (prev: WebsiteConfig) => WebsiteConfig) => void
  openMediaPicker: (cb: (url: string) => void) => void
}> = ({ config, updateConfig, openMediaPicker }) => {
  const seo = config.seo

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">SEO Settings</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
        <input
          type="text"
          value={seo.title}
          onChange={(e) =>
            updateConfig((prev) => ({ ...prev, seo: { ...prev.seo, title: e.target.value } }))
          }
          placeholder="My Salon - Beauty & Wellness"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">{(seo.title || '').length}/60 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
        <textarea
          value={seo.description}
          onChange={(e) =>
            updateConfig((prev) => ({
              ...prev,
              seo: { ...prev.seo, description: e.target.value },
            }))
          }
          rows={3}
          placeholder="Brief description of your salon for search engines"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">{(seo.description || '').length}/160 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
        <input
          type="text"
          value={seo.keywords}
          onChange={(e) =>
            updateConfig((prev) => ({ ...prev, seo: { ...prev.seo, keywords: e.target.value } }))
          }
          placeholder="salon, beauty, nails, hair (comma separated)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Social Share Image (OG Image)</label>
        <ImageUploader
          value={seo.ogImage}
          onChange={(url) =>
            updateConfig((prev) => ({ ...prev, seo: { ...prev.seo, ogImage: url } }))
          }
          shape="landscape"
          placeholder="Upload social share image"
          maxWidth={1200}
        />
      </div>

      {/* SEO Preview */}
      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-500 mb-2">Google Search Preview</p>
        <p className="text-blue-700 text-lg hover:underline cursor-pointer">
          {seo.title || 'Your Salon Name'}
        </p>
        <p className="text-green-700 text-sm">https://yoursalon.beautybooking.com</p>
        <p className="text-sm text-gray-600 mt-1">
          {seo.description || 'Add a meta description to help your salon appear in search results.'}
        </p>
      </div>
    </div>
  )
}

// ============ MEDIA LIBRARY ============

const MediaLibrary: React.FC<{
  files: MediaFile[]
  onAdd: (url: string, filename: string) => void
  onDelete: (id: string) => void
}> = ({ files, onAdd, onDelete }) => {
  const handleUploadComplete = (url: string) => {
    const filename = `upload_${Date.now()}.jpg`
    onAdd(url, filename)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Media Library</h2>

      {/* Upload Area */}
      <ImageUploader
        value=""
        onChange={handleUploadComplete}
        shape="banner"
        placeholder="Click or drag images here to upload"
        removable={false}
        maxWidth={1200}
      />

      {/* Media Grid */}
      {files.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📷</p>
          <p className="font-medium">No media files yet</p>
          <p className="text-sm mt-1">Add images by URL above</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.id} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden">
              <img
                src={file.url}
                alt={file.filename}
                className="w-full h-32 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="128" fill="%23f3f4f6"><rect width="200" height="128"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12">Image</text></svg>'
                }}
              />
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700 truncate">{file.filename}</p>
                <p className="text-xs text-gray-400">{new Date(file.createdAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => onDelete(file.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ MEDIA PICKER MODAL ============

const MediaPickerModal: React.FC<{
  files: MediaFile[]
  onSelect: (url: string) => void
  onClose: () => void
  onAdd: (url: string, filename: string) => void
}> = ({ files, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Select Media</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        </div>

        {/* Upload new image */}
        <div className="p-4 border-b border-gray-100">
          <ImageUploader
            value=""
            onChange={(url) => onSelect(url)}
            shape="banner"
            placeholder="Upload a new image"
            removable={false}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {files.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">No media files. Add one above.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onSelect(file.url)}
                  className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500 transition-colors group"
                >
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="96" fill="%23f3f4f6"><rect width="200" height="96"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10">Image</text></svg>'
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.filename}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ LIVE PREVIEW ============

const LivePreview: React.FC<{ config: WebsiteConfig }> = ({ config }) => {
  const theme = config.theme

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden text-xs"
      style={{ fontFamily: theme.fontFamily }}
    >
      {/* Announcement */}
      {config.announcement && (
        <div
          className="text-center py-1 px-2 text-white text-[10px]"
          style={{ backgroundColor: theme.primaryColor }}
        >
          {config.announcement}
        </div>
      )}

      {/* Navbar Preview */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1">
          {config.navbar.logo && (
            <img src={config.navbar.logo} alt="" className="h-4 w-4 object-contain" />
          )}
          <span className="font-bold text-[10px]">{config.navbar.title || 'Salon'}</span>
        </div>
        <div className="flex gap-2">
          {(config.navbar.links || [])
            .filter((l) => l.enabled)
            .map((l, i) => (
              <span key={i} className="text-[8px] text-gray-500">{l.label}</span>
            ))}
        </div>
      </div>

      {/* Hero Preview */}
      {config.hero.enabled && (
        <div
          className="relative h-28 flex items-center justify-center text-center px-4"
          style={{
            backgroundImage: config.hero.backgroundImage
              ? `url(${config.hero.backgroundImage})`
              : `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="relative z-10">
            <p className="font-bold text-white text-sm drop-shadow-md">{config.hero.title}</p>
            <p className="text-white text-[10px] mt-1 drop-shadow-md">{config.hero.subtitle}</p>
            {config.hero.ctaText && (
              <div
                className="inline-block mt-2 px-3 py-1 text-white text-[10px] font-bold rounded"
                style={{ backgroundColor: theme.primaryColor, borderRadius: theme.borderRadius }}
              >
                {config.hero.ctaText}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sections Preview */}
      {config.sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.id} className="px-3 py-3 border-b border-gray-50">
            <p className="font-bold text-[10px] text-gray-800">{section.title}</p>
            {section.subtitle && (
              <p className="text-[8px] text-gray-500 mt-0.5">{section.subtitle}</p>
            )}
            {section.type === 'gallery' && (section.images || []).length > 0 && (
              <div className="flex gap-1 mt-1">
                {(section.images || []).slice(0, 3).map((img, i) => (
                  <img key={i} src={img} alt="" className="w-8 h-8 object-cover rounded" />
                ))}
              </div>
            )}
            {section.type === 'services' && (
              <div className="mt-1 space-y-0.5">
                <div className="h-2 w-3/4 bg-gray-100 rounded"></div>
                <div className="h-2 w-1/2 bg-gray-100 rounded"></div>
              </div>
            )}
          </div>
        ))}

      {/* Footer Preview */}
      {config.footer.enabled && (
        <div className="px-3 py-2 bg-gray-900 text-white">
          <p className="text-[8px]">{config.footer.text || 'Footer'}</p>
          {config.footer.showSocial && (
            <div className="flex gap-2 mt-1 text-[8px] text-gray-400">
              {config.footer.socialLinks?.facebook && <span>FB</span>}
              {config.footer.socialLinks?.instagram && <span>IG</span>}
              {config.footer.socialLinks?.twitter && <span>X</span>}
              {config.footer.socialLinks?.tiktok && <span>TT</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ServicesManager is now imported from ../components/ServicesManager

