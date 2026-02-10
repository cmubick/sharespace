import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import MediaViewer from '../components/MediaViewer.tsx'
import { getApiUrl, getMediaUrl } from '../services/api'
import { getUserId } from '../services/auth'
import '../styles/GalleryPage.css'

interface MediaItem {
  id: string
  filename: string
  uploader: string
  uploadTimestamp: string
  mediaType: string
  s3Key: string
  thumbnailKey?: string
  caption?: string
  year?: number
}

interface GroupedMedia {
  [year: string]: MediaItem[]
}

interface LocationState {
  uploadedMediaId?: string
}

const GalleryPage = () => {
  const location = useLocation()
  const [groupedMedia, setGroupedMedia] = useState<GroupedMedia>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const uploadedMediaId = (location.state as LocationState)?.uploadedMediaId

  // Lazy loading refs
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Initialize Intersection Observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.classList.add('loaded')
              observerRef.current?.unobserve(img)
            }
          }
        })
      },
      { rootMargin: '50px' }
    )

    return () => observerRef.current?.disconnect()
  }, [])

  // Observe image when added to DOM
  const observeImage = useCallback((id: string, img: HTMLImageElement | null) => {
    if (img) {
      imageRefs.current.set(id, img)
      observerRef.current?.observe(img)
    }
  }, [])

  // Fetch media list from API
  const loadMedia = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${getApiUrl('/media')}?userId=${encodeURIComponent(getUserId())}`
      )
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to fetch media')
      }
      const data = await response.json()
      const items = (data.items || []) as MediaItem[]

      groupMediaByYear(items)
    } catch (err) {
      console.error('Failed to load media:', err)
      setError('Failed to load gallery. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Group media by year
  const groupMediaByYear = (items: MediaItem[]) => {
    const grouped: GroupedMedia = {}

    items.forEach((item) => {
      const year = item.year ? item.year.toString() : 'Unknown Year'
      if (!grouped[year]) {
        grouped[year] = []
      }
      grouped[year].push(item)
    })

    // Sort years in descending order, with "Unknown Year" at the end
    const sorted: GroupedMedia = {}
    const years = Object.keys(grouped)
      .filter((y) => y !== 'Unknown Year')
      .sort((a, b) => parseInt(b) - parseInt(a))

    years.forEach((year) => {
      sorted[year] = grouped[year]
    })

    if (grouped['Unknown Year']) {
      sorted['Unknown Year'] = grouped['Unknown Year']
    }

    setGroupedMedia(sorted)
  }

  // Load media on mount
  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  // Generate image URL from S3 key
  const getImageUrl = (key: string) => {
    return getMediaUrl(key)
  }

  const getMediaIcon = (mediaType: string) => {
    if (mediaType === 'image' || mediaType.startsWith('image/')) return '🖼️'
    if (mediaType === 'video' || mediaType.startsWith('video/')) return '🎬'
    if (mediaType === 'audio' || mediaType.startsWith('audio/')) return '🎧'
    return '📄'
  }

  return (
    <div className="gallery-page">
      <div className="gallery-container">
        <h1>Gallery</h1>

        {/* Upload Success Message */}
        {uploadedMediaId && (
          <div className="upload-success">
            <div className="success-icon">✓</div>
            <h2>Upload Successful!</h2>
            <p>Your media has been uploaded and will appear in the gallery shortly.</p>
            <p className="media-id">Media ID: {uploadedMediaId}</p>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="error-message active">{error}</div>}

        {/* Loading State */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading gallery...</p>
          </div>
        ) : Object.keys(groupedMedia).length === 0 ? (
          <div className="empty-state">
            <p>No media uploaded yet</p>
            <p className="empty-hint">Upload your first photo or video to get started</p>
          </div>
        ) : (
          <div className="gallery-content">
            {Object.entries(groupedMedia).map(([year, items]) => (
              <section key={year} className="year-section">
                <h2 className="year-header">{year}</h2>
                <div className="media-grid">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="media-card"
                      onClick={() => setSelectedMedia(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedMedia(item)
                        }
                      }}
                    >
                      <div className="media-thumbnail">
                        {item.mediaType === 'image' || item.mediaType.startsWith('image/') ? (
                          <img
                            ref={(el) => {
                              if (el) observeImage(item.id, el)
                            }}
                            data-src={getImageUrl(item.thumbnailKey || item.s3Key)}
                            data-full-src={getImageUrl(item.s3Key)}
                            alt={item.filename}
                            onLoad={() => {
                              const selectedKey = item.thumbnailKey || item.s3Key
                              const finalUrl = getImageUrl(selectedKey)
                              console.log('Gallery image selection', {
                                mediaId: item.id,
                                s3Key: item.s3Key,
                                thumbnailKey: item.thumbnailKey,
                                finalUrl,
                              })
                            }}
                            onError={(e) => {
                              const img = e.currentTarget
                              const fullSrc = img.getAttribute('data-full-src')
                              if (fullSrc && img.src !== fullSrc) {
                                img.src = fullSrc
                                img.classList.add('loaded')
                              }
                            }}
                            className="lazy-image"
                          />
                        ) : (
                          <div className="media-placeholder">
                            <span className="media-icon">
                              {getMediaIcon(item.mediaType)}
                            </span>
                          </div>
                        )}
                        <div className="media-overlay">
                          <p className="view-text">View</p>
                        </div>
                      </div>
                      <div className="media-info">
                        <h3 className="filename" title={item.filename}>
                          {item.filename}
                        </h3>
                        <p className="uploader">{item.uploader}</p>
                        {item.caption && (
                          <p className="caption" title={item.caption}>
                            {item.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />
      )}
    </div>
  )
}

export default GalleryPage
