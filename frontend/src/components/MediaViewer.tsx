import { useEffect, useState, useRef } from 'react'
import { getApiUrl, getMediaUrl } from '../services/api'
import '../styles/MediaViewer.css'

interface MediaItem {
  id: string
  filename: string
  uploader: string
  uploadTimestamp: string
  mediaType: string
  s3Key: string
  caption?: string
  year?: number
  album?: string
}

interface MediaViewerProps {
  media: MediaItem
  allMedia?: MediaItem[]
  onClose: () => void
  onNavigate?: (media: MediaItem) => void
  onUpdate: (updated: MediaItem) => void
  onDelete: (mediaId: string) => void
}

const MediaViewer = ({ media, allMedia = [], onClose, onNavigate, onUpdate, onDelete }: MediaViewerProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    caption: media.caption || '',
    year: media.year ? String(media.year) : '',
    album: media.album || '',
  })
  const [touchStart, setTouchStart] = useState(0)
  const touchRef = useRef<HTMLDivElement>(null)

  // Calculate current index
  const currentIndex = allMedia.findIndex((m) => m.id === media.id)

  // Navigation with wrap-around
  const navigatePrevious = () => {
    if (!onNavigate || allMedia.length === 0) return
    const prevIndex = currentIndex === 0 ? allMedia.length - 1 : currentIndex - 1
    onNavigate(allMedia[prevIndex])
  }

  const navigateNext = () => {
    if (!onNavigate || allMedia.length === 0) return
    const nextIndex = currentIndex === allMedia.length - 1 ? 0 : currentIndex + 1
    onNavigate(allMedia[nextIndex])
  }

  useEffect(() => {
    setForm({
      caption: media.caption || '',
      year: media.year ? String(media.year) : '',
      album: media.album || '',
    })
  }, [media])
  // Close modal on Escape key, navigate with arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && allMedia.length > 1) {
        e.preventDefault()
        navigatePrevious()
      } else if (e.key === 'ArrowRight' && allMedia.length > 1) {
        e.preventDefault()
        navigateNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNavigate, currentIndex, allMedia])

  // Swipe gesture support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    // Swipe left (show next) - threshold 50px
    if (diff > 50 && allMedia.length > 1) {
      navigateNext()
    }
    // Swipe right (show previous) - threshold 50px
    else if (diff < -50 && allMedia.length > 1) {
      navigatePrevious()
    }
  }

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const resolveMediaUrl = (s3Key: string) => getMediaUrl(s3Key)

  const sanitizeFilenamePart = (value: string) => {
    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const getFileExtension = (filename: string, s3Key: string) => {
    const fromFilename = filename.split('.').pop()
    if (fromFilename && fromFilename !== filename) return fromFilename.toLowerCase()
    const fromKey = s3Key.split('.').pop()
    if (fromKey && fromKey !== s3Key) return fromKey.toLowerCase()
    return 'bin'
  }

  const buildDownloadFilename = () => {
    const ext = getFileExtension(media.filename, media.s3Key)
    const year = media.year ? String(media.year) : ''
    const caption = media.caption ? sanitizeFilenamePart(media.caption) : ''
    const uploader = media.uploader ? sanitizeFilenamePart(media.uploader) : ''

    const parts = [year, caption, uploader].filter(Boolean)
    let baseName = parts.join('-')
    if (!baseName) {
      baseName = `media-${sanitizeFilenamePart(media.uploadTimestamp || String(Date.now()))}`
    }

    if (baseName.length > 80) {
      baseName = baseName.slice(0, 80).replace(/-+$/g, '')
    }

    return `${baseName}.${ext}`
  }

  const getMediaIcon = (mediaType: string) => {
    if (mediaType === 'image' || mediaType.startsWith('image/')) return '🖼️'
    if (mediaType === 'video' || mediaType.startsWith('video/')) return '🎬'
    if (mediaType === 'audio' || mediaType.startsWith('audio/')) return '🎧'
    return '📄'
  }

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Unknown date'
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      const payload: Record<string, any> = {}
      if (form.caption.trim()) payload.caption = form.caption.trim()
      if (form.year.trim()) payload.year = Number(form.year)
      if (form.album.trim()) payload.album = form.album.trim()

      const response = await fetch(getApiUrl(`/media/${media.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to update media')
      }

      const updated = await response.json()
      onUpdate({
        ...media,
        ...updated,
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update media')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this media? This cannot be undone.')
    if (!confirmed) return

    try {
      setSaving(true)
      setError('')

      const response = await fetch(getApiUrl(`/media/${media.id}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to delete media')
      }

      onDelete(media.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete media')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    if (downloading) return
    try {
      setDownloading(true)
      setError('')

      const url = resolveMediaUrl(media.s3Key)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to download media')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = buildDownloadFilename()
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download media')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        ref={touchRef}
      >
        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              className="nav-arrow nav-arrow-left"
              onClick={navigatePrevious}
              aria-label="Previous media"
              title="Previous (← arrow or swipe right)"
            >
              ❮
            </button>
            <button
              className="nav-arrow nav-arrow-right"
              onClick={navigateNext}
              aria-label="Next media"
              title="Next (→ arrow or swipe left)"
            >
              ❯
            </button>
          </>
        )}

        {/* Close Button */}
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        {/* Media Display */}
        <div className="modal-media">
          {media.mediaType === 'image' || media.mediaType.startsWith('image/') ? (
            <img
              src={resolveMediaUrl(media.s3Key)}
              alt={media.filename}
              className="modal-image"
            />
          ) : media.mediaType === 'video' || media.mediaType.startsWith('video/') ? (
            <div className="modal-video-placeholder">
              <span className="media-icon">🎬</span>
              <p>{media.filename}</p>
            </div>
          ) : (
            <div className="modal-file-placeholder">
              <span className="media-icon">{getMediaIcon(media.mediaType)}</span>
              <p>{media.filename}</p>
            </div>
          )}
        </div>

        {/* Media Info */}
        <div className="modal-info">
          <div className="info-header">
            <h2>{media.filename}</h2>
            <button
              className="modal-close-icon"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <div className="info-details">
            {error && <div className="error-message active">{error}</div>}
            <div className="detail-row">
              <span className="detail-label">Uploaded by:</span>
              <span className="detail-value">{media.uploader}</span>
            </div>

            {isEditing ? (
              <>
                <div className="detail-row">
                  <span className="detail-label">Caption:</span>
                  <textarea
                    name="caption"
                    value={form.caption}
                    onChange={handleChange}
                    className="detail-input"
                    rows={2}
                  />
                </div>
                <div className="detail-row">
                  <span className="detail-label">Year:</span>
                  <input
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    className="detail-input"
                    type="number"
                    min={1900}
                    max={2100}
                  />
                </div>
                <div className="detail-row">
                  <span className="detail-label">Album:</span>
                  <input
                    name="album"
                    value={form.album}
                    onChange={handleChange}
                    className="detail-input"
                    type="text"
                  />
                </div>
              </>
            ) : (
              <>
                {media.caption && (
                  <div className="detail-row">
                    <span className="detail-label">Caption:</span>
                    <span className="detail-value caption-value">{media.caption}</span>
                  </div>
                )}

                {media.year && (
                  <div className="detail-row">
                    <span className="detail-label">Year:</span>
                    <span className="detail-value">{media.year}</span>
                  </div>
                )}

                {media.album && (
                  <div className="detail-row">
                    <span className="detail-label">Album:</span>
                    <span className="detail-value">{media.album}</span>
                  </div>
                )}
              </>
            )}

            <div className="detail-row">
              <span className="detail-label">Uploaded:</span>
              <span className="detail-value">{formatDate(media.uploadTimestamp)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{media.mediaType}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span className="detail-value id-value">{media.id}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            {isEditing ? (
              <>
                <button className="btn-close" onClick={() => setIsEditing(false)} disabled={saving}>
                  Cancel
                </button>
                <button className="btn-download" onClick={handleSave} disabled={saving}>
                  Save changes
                </button>
              </>
            ) : (
              <>
                <button className="btn-download" onClick={handleDownload} disabled={downloading}>
                  {downloading ? 'Downloading…' : 'Download'}
                </button>
                <button className="btn-download" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
                <button className="btn-close" onClick={handleDelete} disabled={saving}>
                  Delete media
                </button>
                <button className="btn-close" onClick={onClose}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MediaViewer
