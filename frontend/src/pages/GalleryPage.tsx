import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import MediaViewer from '../components/MediaViewer.tsx'
import '../styles/GalleryPage.css'

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

      // TODO: Replace with actual API endpoint
      // For now, use mock data to demonstrate functionality
      const mockData: MediaItem[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          filename: 'vacation-2024.jpg',
          uploader: 'John Doe',
          uploadTimestamp: new Date().toISOString(),
          mediaType: 'image/jpeg',
          s3Key: 'media/550e8400-e29b-41d4-a716-446655440000.jpg',
          caption: 'Summer vacation at the beach',
          year: 2024,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          filename: 'family-photo.jpg',
          uploader: 'Jane Smith',
          uploadTimestamp: new Date().toISOString(),
          mediaType: 'image/jpeg',
          s3Key: 'media/550e8400-e29b-41d4-a716-446655440001.jpg',
          caption: 'Family gathering',
          year: 2023,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          filename: 'old-photo.png',
          uploader: 'Mike Johnson',
          uploadTimestamp: new Date().toISOString(),
          mediaType: 'image/png',
          s3Key: 'media/550e8400-e29b-41d4-a716-446655440002.png',
          year: 2022,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          filename: 'undated-photo.gif',
          uploader: 'Sarah Lee',
          uploadTimestamp: new Date().toISOString(),
          mediaType: 'image/gif',
          s3Key: 'media/550e8400-e29b-41d4-a716-446655440003.gif',
          caption: 'Funny moment',
        },
      ]

      // Real API call would be:
      // const response = await fetch('/api/media/list')
      // if (!response.ok) throw new Error('Failed to fetch media')
      // const data = await response.json()

      groupMediaByYear(mockData)
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
  const getImageUrl = (s3Key: string) => {
    // TODO: Replace with actual S3 CloudFront URL
    return `https://via.placeholder.com/300x300?text=${encodeURIComponent(s3Key)}`
  }

  const getMediaIcon = (mediaType: string) => {
    if (mediaType.startsWith('image/')) return '🖼️'
    if (mediaType === 'video/mp4') return '🎬'
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
                        {item.mediaType.startsWith('image/') ? (
                          <img
                            ref={(el) => {
                              if (el) observeImage(item.id, el)
                            }}
                            data-src={getImageUrl(item.s3Key)}
                            alt={item.filename}
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
