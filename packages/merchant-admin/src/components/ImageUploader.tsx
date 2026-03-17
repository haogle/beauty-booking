import { useState, useRef, useCallback } from 'react'
import api from '../lib/api'

// ============ TYPES ============

interface ImageUploaderProps {
  /** Current image URL (or data URI) */
  value?: string
  /** Called when image URL changes */
  onChange: (url: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Shape of the image area */
  shape?: 'landscape' | 'square' | 'banner'
  /** Allow removing the image */
  removable?: boolean
  /** Max width to resize to (default 800) */
  maxWidth?: number
  /** JPEG quality 0-1 (default 0.8) */
  quality?: number
  /** CSS class for outer container */
  className?: string
}

interface MultiImageUploaderProps {
  /** Current image URLs */
  value: string[]
  /** Called when images change */
  onChange: (urls: string[]) => void
  /** Max images allowed */
  maxImages?: number
  /** Max width to resize to */
  maxWidth?: number
  /** JPEG quality 0-1 */
  quality?: number
  /** CSS class for outer container */
  className?: string
}

// ============ IMAGE COMPRESSION ============

const compressImage = (
  file: File,
  maxWidth: number,
  quality: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        // Resize if needed
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }

        ctx.drawImage(img, 0, 0, width, height)

        // Convert to JPEG data URI
        const dataUri = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUri)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// ============ UPLOAD HELPER ============

const uploadToMediaLibrary = async (
  dataUri: string,
  filename: string
): Promise<string> => {
  try {
    const response = await api.post('/api/v1/merchant/salon/media', {
      filename,
      url: dataUri,
      mimeType: 'image/jpeg',
      sizeBytes: Math.round(dataUri.length * 0.75), // approximate decoded size
    })
    const result = response.data?.data || response.data
    return result.url || dataUri
  } catch {
    // If media library save fails, still return the data URI so the image works
    return dataUri
  }
}

// ============ SINGLE IMAGE UPLOADER ============

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  placeholder = 'Click or drag to upload',
  shape = 'landscape',
  removable = true,
  maxWidth = 800,
  quality = 0.8,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const heightClass = shape === 'banner' ? 'h-32' : shape === 'square' ? 'h-48 w-48' : 'h-44'

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be under 20MB')
      return
    }

    try {
      setUploading(true)
      setError('')
      const dataUri = await compressImage(file, maxWidth, quality)
      const url = await uploadToMediaLibrary(dataUri, file.name)
      onChange(url)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [maxWidth, quality, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  return (
    <div className={className}>
      {value ? (
        /* Image Preview */
        <div className={`relative ${heightClass} rounded-xl overflow-hidden border border-gray-200 group bg-gray-50`}>
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => inputRef.current?.click()}
              className="bg-white text-gray-700 text-xs font-semibold py-2 px-3 rounded-lg shadow hover:bg-gray-100 transition-colors"
            >
              Replace
            </button>
            {removable && (
              <button
                onClick={() => onChange('')}
                className="bg-red-500 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      ) : (
        /* Upload Area */
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`${heightClass} rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center ${
            dragOver
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-300 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
          }`}
        >
          {uploading ? (
            <div className="text-center">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Compressing & uploading...</p>
            </div>
          ) : (
            <div className="text-center px-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">{placeholder}</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Max 20MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-2">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          // Reset so same file can be re-selected
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ============ MULTI IMAGE UPLOADER ============

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({
  value,
  onChange,
  maxImages = 10,
  maxWidth = 800,
  quality = 0.8,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const remaining = maxImages - value.length
    if (remaining <= 0) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    const filesToProcess = Array.from(files).slice(0, remaining)
    const imageFiles = filesToProcess.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      setError('Please select image files')
      return
    }

    try {
      setUploading(true)
      setError('')
      const newUrls: string[] = []
      for (const file of imageFiles) {
        const dataUri = await compressImage(file, maxWidth, quality)
        const url = await uploadToMediaLibrary(dataUri, file.name)
        newUrls.push(url)
      }
      onChange([...value, ...newUrls])
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [value, maxImages, maxWidth, quality, onChange])

  const handleRemove = (index: number) => {
    const newUrls = [...value]
    newUrls.splice(index, 1)
    onChange(newUrls)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {/* Existing Images */}
        {value.map((url, index) => (
          <div
            key={`img-${index}`}
            className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 group"
          >
            <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
            {index === 0 && (
              <span className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                Cover
              </span>
            )}
            <button
              onClick={() => handleRemove(index)}
              className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add Button */}
        {value.length < maxImages && (
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all flex flex-col items-center justify-center"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-gray-400 mt-1">Add Image</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-2">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default ImageUploader
