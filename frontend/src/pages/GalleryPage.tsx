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
  album?: string
}

interface GroupedMedia {
  [year: string]: MediaItem[]
}

interface LocationState {
  uploadedMediaId?: string
}

const GalleryPage = () => {
  const location = useLocation()
  const PAGE_SIZE = 30
  const STORAGE_KEY = 'sharespace_gallery_state'
  const hasRestoredRef = useRef(false)
  const [groupedMedia, setGroupedMedia] = useState<GroupedMedia>({})
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [lastKey, setLastKey] = useState<Record<string, unknown> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const uploadedMediaId = (location.state as LocationState)?.uploadedMediaId

  const isFetchingRef = useRef(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const loadMoreObserverRef = useRef<IntersectionObserver | null>(null)

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

  const encodeLastKey = (key: Record<string, unknown>) => {
    return btoa(JSON.stringify(key))
  }

  // Fetch media list from API
  const loadMedia = useCallback(async ({ reset }: { reset?: boolean } = {}) => {
    if (isFetchingRef.current) return
    if (!reset && !hasMore) return

    isFetchingRef.current = true
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError('')

      const params = new URLSearchParams()
      params.set('userId', getUserId())
      params.set('limit', PAGE_SIZE.toString())
      if (!reset && lastKey) {
        params.set('lastKey', encodeLastKey(lastKey))
      }

      const response = await fetch(
        `${getApiUrl('/media')}?${params.toString()}`
      )
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to fetch media')
      }
      const data = await response.json()
      const items = (data.items || []) as MediaItem[]
      const nextLastKey = data.lastKey || null

      setItems((prev) => (reset ? items : [...prev, ...items]))
      setLastKey(nextLastKey)
      setHasMore(Boolean(nextLastKey))
    } catch (err) {
      console.error('Failed to load media:', err)
      setError('Failed to load gallery. Please try again.')
    } finally {
      if (reset) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
      isFetchingRef.current = false
    }
  }, [PAGE_SIZE, hasMore, lastKey])

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

    Object.keys(grouped).forEach((year) => {
      grouped[year].sort((a, b) => {
        const aTime = a.uploadTimestamp ? new Date(a.uploadTimestamp).getTime() : 0
        const bTime = b.uploadTimestamp ? new Date(b.uploadTimestamp).getTime() : 0
        return aTime - bTime
      })
    })

    // Sort years in ascending order, with "Unknown Year" at the end
    const sorted: GroupedMedia = {}
    const years = Object.keys(grouped)
      .filter((y) => y !== 'Unknown Year')
      .sort((a, b) => parseInt(a) - parseInt(b))

    years.forEach((year) => {
      sorted[year] = grouped[year]
    })

    if (grouped['Unknown Year']) {
      sorted['Unknown Year'] = grouped['Unknown Year']
    }

    setGroupedMedia(sorted)
  }

  const updateMediaItem = (updated: MediaItem) => {
    setItems((prev) => prev.map((item) =>
      item.id === updated.id ? { ...item, ...updated } : item
    ))
    setSelectedMedia(updated)
  }

  const removeMediaItem = (mediaId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== mediaId))
    setSelectedMedia(null)
  }

  // Load media on mount
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true

    const cached = sessionStorage.getItem(STORAGE_KEY)
    if (cached && !uploadedMediaId) {
      try {
        const parsed = JSON.parse(cached) as {
          items: MediaItem[]
          lastKey: Record<string, unknown> | null
          hasMore: boolean
        }
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items)
          setLastKey(parsed.lastKey || null)
          setHasMore(parsed.hasMore ?? Boolean(parsed.lastKey))
          setLoading(false)
          return
        }
      } catch (err) {
        console.warn('Failed to restore gallery cache:', err)
      }
    }

    loadMedia({ reset: true })
  }, [loadMedia, uploadedMediaId])

  useEffect(() => {
    groupMediaByYear(items)
  }, [items])

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, lastKey, hasMore })
    )
  }, [items, lastKey, hasMore])

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    if (loadMoreObserverRef.current) {
      loadMoreObserverRef.current.disconnect()
    }

    loadMoreObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMedia()
          }
        })
      },
      { rootMargin: '200px 0px' }
    )

    const target = loadMoreRef.current
    if (target && hasMore) {
      loadMoreObserverRef.current.observe(target)
    }

    return () => loadMoreObserverRef.current?.disconnect()
  }, [hasMore, items.length, loadMedia])

  useEffect(() => {
    if (typeof window === 'undefined' || 'IntersectionObserver' in window) {
      return
    }

    const handleScroll = () => {
      if (!hasMore || isFetchingRef.current) return
      const scrollPosition = window.scrollY + window.innerHeight
      const threshold = document.body.offsetHeight - 400
      if (scrollPosition >= threshold) {
        loadMedia()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [hasMore, loadMedia])

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
            <div ref={loadMoreRef} className="load-more-sentinel" aria-hidden="true" />
            {loadingMore && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading more...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onUpdate={updateMediaItem}
          onDelete={removeMediaItem}
        />
      )}
    </div>
  )
}

export default GalleryPage
