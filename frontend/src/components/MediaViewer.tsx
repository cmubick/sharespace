import { useEffect } from 'react'
import { getMediaUrl } from '../services/api'
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
}

interface MediaViewerProps {
  media: MediaItem
  onClose: () => void
}

const MediaViewer = ({ media, onClose }: MediaViewerProps) => {
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
            <div className="detail-row">
              <span className="detail-label">Uploaded by:</span>
              <span className="detail-value">{media.uploader}</span>
            </div>

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
            <a
              href={resolveMediaUrl(media.s3Key)}
              download={media.filename}
              className="btn-download"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
            <button className="btn-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MediaViewer
