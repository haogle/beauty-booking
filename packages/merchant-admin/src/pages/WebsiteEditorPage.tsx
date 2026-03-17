import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

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
        <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={hero.backgroundImage}
            onChange={(e) =>
              updateConfig((prev) => ({
                ...prev,
                hero: { ...prev.hero, backgroundImage: e.target.value },
              }))
            }
            placeholder="Enter image URL or pick from media library"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={() =>
              openMediaPicker((url) =>
                updateConfig((prev) => ({ ...prev, hero: { ...prev.hero, backgroundImage: url } }))
              )
            }
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Browse
          </button>
        </div>
        {hero.backgroundImage && (
          <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
            <img src={hero.backgroundImage} alt="Hero background" className="w-full h-32 object-cover" />
          </div>
        )}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={section.image || ''}
                          onChange={(e) => updateSection(section.id, { image: e.target.value })}
                          placeholder="Image URL"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <button
                          onClick={() =>
                            openMediaPicker((url) => updateSection(section.id, { image: url }))
                          }
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                        >
                          Browse
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {section.type === 'gallery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gallery Images ({(section.images || []).length})
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {(section.images || []).map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img} alt={`Gallery ${i}`} className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                          <button
                            onClick={() => {
                              const newImages = [...(section.images || [])]
                              newImages.splice(i, 1)
                              updateSection(section.id, { images: newImages })
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        openMediaPicker((url) =>
                          updateSection(section.id, { images: [...(section.images || []), url] })
                        )
                      }
                      className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      + Add Image
                    </button>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={navbar.logo}
            onChange={(e) =>
              updateConfig((prev) => ({ ...prev, navbar: { ...prev.navbar, logo: e.target.value } }))
            }
            placeholder="Logo image URL"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={() =>
              openMediaPicker((url) =>
                updateConfig((prev) => ({ ...prev, navbar: { ...prev.navbar, logo: url } }))
              )
            }
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Browse
          </button>
        </div>
        {navbar.logo && (
          <img src={navbar.logo} alt="Logo" className="mt-2 h-10 object-contain" />
        )}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={sp.coverImage}
            onChange={(e) =>
              updateConfig((prev) => ({
                ...prev,
                servicePage: { ...prev.servicePage, coverImage: e.target.value },
              }))
            }
            placeholder="Service page cover image URL"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={() =>
              openMediaPicker((url) =>
                updateConfig((prev) => ({
                  ...prev,
                  servicePage: { ...prev.servicePage, coverImage: url },
                }))
              )
            }
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Browse
          </button>
        </div>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Social Share Image (OG Image)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={seo.ogImage}
            onChange={(e) =>
              updateConfig((prev) => ({ ...prev, seo: { ...prev.seo, ogImage: e.target.value } }))
            }
            placeholder="Image URL for social media sharing"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={() =>
              openMediaPicker((url) =>
                updateConfig((prev) => ({ ...prev, seo: { ...prev.seo, ogImage: url } }))
              )
            }
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Browse
          </button>
        </div>
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
  const [newUrl, setNewUrl] = useState('')
  const [newFilename, setNewFilename] = useState('')

  const handleAdd = () => {
    if (!newUrl) return
    const filename = newFilename || newUrl.split('/').pop() || 'image.jpg'
    onAdd(newUrl, filename)
    setNewUrl('')
    setNewFilename('')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Media Library</h2>

      {/* Add by URL */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Add Image by URL</p>
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={newFilename}
            onChange={(e) => setNewFilename(e.target.value)}
            placeholder="Optional filename"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            disabled={!newUrl}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

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
}> = ({ files, onSelect, onClose, onAdd }) => {
  const [newUrl, setNewUrl] = useState('')

  const handleAddAndSelect = () => {
    if (!newUrl) return
    onAdd(newUrl, newUrl.split('/').pop() || 'image.jpg')
    onSelect(newUrl)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Select Media</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
        </div>

        {/* Add by URL */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Paste image URL and press Add"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddAndSelect}
              disabled={!newUrl}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              Add & Select
            </button>
          </div>
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

// ============ SERVICES MANAGER (Integrated) ============

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
  addons?: SvcAddon[]
}

interface SvcCategory {
  id?: string
  name: string
  services?: SvcService[]
}

const ServicesManager: React.FC = () => {
  const [categories, setCategories] = useState<SvcCategory[]>([])
  const [svcLoading, setSvcLoading] = useState(true)
  const [svcError, setSvcError] = useState('')
  const [svcSuccess, setSvcSuccess] = useState('')

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<SvcCategory | null>(null)
  const [editingService, setEditingService] = useState<SvcService | null>(null)
  const [editingAddon, setEditingAddon] = useState<SvcAddon | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')

  const [categoryName, setCategoryName] = useState('')
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', duration: '', categoryId: '' })
  const [addonForm, setAddonForm] = useState({ name: '', price: '', duration: '' })

  useEffect(() => { fetchCategories() }, [])

  const fetchCategories = async () => {
    try {
      setSvcLoading(true)
      const response = await api.get('/api/v1/merchant/salon/services')
      const result = response.data?.data || response.data
      setCategories(Array.isArray(result) ? result : (result?.categories || []))
      setSvcError('')
    } catch (err: any) {
      setSvcError(err.message || 'Failed to load services')
    } finally {
      setSvcLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!categoryName.trim()) { setSvcError('Category name is required'); return }
    try {
      await api.post('/api/v1/merchant/salon/service-categories', { name: categoryName })
      setCategoryName(''); setShowCategoryForm(false)
      setSvcSuccess('Category added'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to add category') }
  }

  const handleEditCategory = async () => {
    if (!editingCategory?.id || !categoryName.trim()) { setSvcError('Category name is required'); return }
    try {
      await api.put(`/api/v1/merchant/salon/service-categories/${editingCategory.id}`, { name: categoryName })
      setCategoryName(''); setEditingCategory(null); setShowCategoryForm(false)
      setSvcSuccess('Category updated'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to update category') }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category and all its services?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/service-categories/${id}`)
      setSvcSuccess('Category deleted'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to delete category') }
  }

  const handleAddService = async () => {
    const { name, description, price, duration, categoryId } = serviceForm
    if (!name.trim() || !price || !duration || !categoryId) { setSvcError('All service fields are required'); return }
    try {
      await api.post('/api/v1/merchant/salon/services', {
        name: name.trim(), description: description.trim(),
        price: parseFloat(price), duration: parseInt(duration), categoryId
      })
      setServiceForm({ name: '', description: '', price: '', duration: '', categoryId: '' }); setShowServiceModal(false)
      setSvcSuccess('Service added'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to add service') }
  }

  const handleEditService = async () => {
    if (!editingService?.id) return
    const { name, description, price, duration, categoryId } = serviceForm
    if (!name.trim() || !price || !duration || !categoryId) { setSvcError('All service fields are required'); return }
    try {
      await api.put(`/api/v1/merchant/salon/services/${editingService.id}`, {
        name: name.trim(), description: description.trim(),
        price: parseFloat(price), duration: parseInt(duration), categoryId
      })
      setServiceForm({ name: '', description: '', price: '', duration: '', categoryId: '' })
      setEditingService(null); setShowServiceModal(false)
      setSvcSuccess('Service updated'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to update service') }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm('Delete this service?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/services/${id}`)
      setSvcSuccess('Service deleted'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to delete service') }
  }

  const handleAddAddon = async () => {
    if (!selectedServiceId) return
    const { name, price, duration } = addonForm
    if (!name.trim() || !price || !duration) { setSvcError('All add-on fields are required'); return }
    try {
      await api.post(`/api/v1/merchant/salon/services/${selectedServiceId}/addons`, {
        name: name.trim(), price: parseFloat(price), duration: parseInt(duration)
      })
      setAddonForm({ name: '', price: '', duration: '' }); setShowAddonModal(false)
      setSvcSuccess('Add-on added'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to add add-on') }
  }

  const handleEditAddon = async () => {
    if (!editingAddon?.id) return
    const { name, price, duration } = addonForm
    if (!name.trim() || !price || !duration) { setSvcError('All add-on fields are required'); return }
    try {
      await api.put(`/api/v1/merchant/salon/service-addons/${editingAddon.id}`, {
        name: name.trim(), price: parseFloat(price), duration: parseInt(duration)
      })
      setAddonForm({ name: '', price: '', duration: '' }); setEditingAddon(null); setShowAddonModal(false)
      setSvcSuccess('Add-on updated'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to update add-on') }
  }

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('Delete this add-on?')) return
    try {
      await api.delete(`/api/v1/merchant/salon/service-addons/${id}`)
      setSvcSuccess('Add-on deleted'); setTimeout(() => setSvcSuccess(''), 3000)
      await fetchCategories()
    } catch (err: any) { setSvcError(err.message || 'Failed to delete add-on') }
  }

  const openCategoryForm = (cat?: SvcCategory) => {
    if (cat) { setEditingCategory(cat); setCategoryName(cat.name) }
    else { setCategoryName(''); setEditingCategory(null) }
    setShowCategoryForm(true)
  }

  const openServiceModal = (categoryId: string, service?: SvcService) => {
    if (service) {
      setEditingService(service)
      setServiceForm({ name: service.name, description: service.description || '', price: service.price.toString(), duration: service.duration.toString(), categoryId: service.categoryId || categoryId })
    } else {
      setServiceForm({ name: '', description: '', price: '', duration: '', categoryId })
      setEditingService(null)
    }
    setShowServiceModal(true)
  }

  const openAddonModal = (serviceId: string, addon?: SvcAddon) => {
    if (addon) {
      setEditingAddon(addon)
      setAddonForm({ name: addon.name, price: addon.price.toString(), duration: addon.duration.toString() })
    } else {
      setAddonForm({ name: '', price: '', duration: '' })
      setEditingAddon(null)
    }
    setSelectedServiceId(serviceId)
    setShowAddonModal(true)
  }

  if (svcLoading) return <div className="text-center py-12"><p className="text-gray-500">Loading services...</p></div>

  return (
    <div className="space-y-6">
      {svcError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {svcError}
          <button onClick={() => setSvcError('')} className="ml-3 underline text-xs">Dismiss</button>
        </div>
      )}
      {svcSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {svcSuccess}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Services Management</h2>
        <div className="flex gap-2">
          <button onClick={() => openCategoryForm()} className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-4 rounded-lg">
            + Category
          </button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-2">No service categories yet</p>
          <button onClick={() => openCategoryForm()} className="text-purple-600 hover:text-purple-800 font-semibold text-sm">
            Create your first category
          </button>
        </div>
      )}

      {categories.map((category) => (
        <div key={category.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">{category.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => openCategoryForm(category)} className="text-purple-600 hover:text-purple-800 text-xs font-semibold">Edit</button>
              <button onClick={() => category.id && handleDeleteCategory(category.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
              <button onClick={() => category.id && openServiceModal(category.id)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-1 px-3 rounded-lg">+ Service</button>
            </div>
          </div>

          {category.services && category.services.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {category.services.map((service) => (
                <div key={service.id} className="px-5 py-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-gray-800">{service.name}</h4>
                        <span className="text-purple-600 font-bold text-sm">${service.price.toFixed(2)}</span>
                        <span className="text-gray-400 text-xs">{service.duration} min</span>
                      </div>
                      {service.description && <p className="text-gray-500 text-sm mt-1">{service.description}</p>}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => service.id && openServiceModal(category.id || '', service)} className="text-purple-600 hover:text-purple-800 text-xs font-semibold">Edit</button>
                      <button onClick={() => service.id && handleDeleteService(service.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
                    </div>
                  </div>

                  {/* Add-ons */}
                  {service.addons && service.addons.length > 0 && (
                    <div className="mt-3 ml-4 space-y-1">
                      {service.addons.map((addon) => (
                        <div key={addon.id} className="flex justify-between items-center bg-purple-50 rounded px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">{addon.name}</span>
                            <span className="text-gray-400 ml-2">+${addon.price.toFixed(2)} / {addon.duration}min</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => service.id && openAddonModal(service.id, addon)} className="text-purple-600 text-xs font-semibold">Edit</button>
                            <button onClick={() => addon.id && handleDeleteAddon(addon.id)} className="text-red-500 text-xs font-semibold">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => service.id && openAddonModal(service.id)} className="mt-2 ml-4 text-purple-600 hover:text-purple-800 text-xs font-semibold">
                    + Add-on
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-6 text-center text-gray-400 text-sm">No services in this category</div>
          )}
        </div>
      ))}

      {/* Category Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setShowCategoryForm(false); setEditingCategory(null); setCategoryName('') }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm">Cancel</button>
              <button onClick={editingCategory ? handleEditCategory : handleAddCategory} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm">{editingCategory ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 my-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editingService ? 'Edit Service' : 'New Service'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                  <input type="number" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
                  <input type="number" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select value={serviceForm.categoryId} onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowServiceModal(false); setEditingService(null); setServiceForm({ name: '', description: '', price: '', duration: '', categoryId: '' }) }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm">Cancel</button>
              <button onClick={editingService ? handleEditService : handleAddService} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm">{editingService ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add-on Modal */}
      {showAddonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editingAddon ? 'Edit Add-on' : 'New Add-on'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={addonForm.name} onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                  <input type="number" step="0.01" value={addonForm.price} onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
                  <input type="number" value={addonForm.duration} onChange={(e) => setAddonForm({ ...addonForm, duration: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowAddonModal(false); setEditingAddon(null); setAddonForm({ name: '', price: '', duration: '' }) }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm">Cancel</button>
              <button onClick={editingAddon ? handleEditAddon : handleAddAddon} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm">{editingAddon ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
