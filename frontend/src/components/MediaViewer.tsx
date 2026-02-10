import { useEffect, useState } from 'react'
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
  onClose: () => void
  onUpdate: (updated: MediaItem) => void
  onDelete: (mediaId: string) => void
}

const MediaViewer = ({ media, onClose, onUpdate, onDelete }: MediaViewerProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    caption: media.caption || '',
    year: media.year ? String(media.year) : '',
    album: media.album || '',
  })

  useEffect(() => {
    setForm({
      caption: media.caption || '',
      year: media.year ? String(media.year) : '',
      album: media.album || '',
    })
  }, [media])
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const resolveMediaUrl = (s3Key: string) => getMediaUrl(s3Key)

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
