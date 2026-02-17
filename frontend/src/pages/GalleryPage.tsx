import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import MediaViewer from '../components/MediaViewer.tsx'
import TimelineSlider from '../components/TimelineSlider.tsx'
import ArchiveDownloadModal from '../components/ArchiveDownloadModal'
import { getApiUrl, getMediaUrl } from '../services/api'
import { getUserId } from '../services/auth'
import { mockMedia } from '../mocks/mockMedia'
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
  const PAGE_SIZE = 1000
  const [groupedMedia, setGroupedMedia] = useState<GroupedMedia>({})
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [lastKey, setLastKey] = useState<Record<string, unknown> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentYear, setCurrentYear] = useState<number | null>(null)
  const uploadedMediaId = (location.state as LocationState)?.uploadedMediaId
  const useMocks = import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS === 'true'

  const isFetchingRef = useRef(false)
  const viewportFilledRef = useRef(false)
  const hasInitializedRef = useRef(false)
  const currentYearRef = useRef<number | null>(null)
  const isProgrammaticScrollRef = useRef(false)
  const isDraggingRef = useRef(false)
  const isScrollSettlingRef = useRef(false)
  const scrollSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  const dragScrollRafRef = useRef<number | null>(null)
  const pendingDragYearRef = useRef<number | null>(null)

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

  useEffect(() => {
    currentYearRef.current = currentYear
  }, [currentYear])

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

  const loadMockPage = (reset?: boolean) => {
    const offset = reset ? 0 : Number(lastKey?.offset ?? 0)
    const nextSlice = mockMedia.slice(offset, offset + PAGE_SIZE)
    const mappedItems = nextSlice.map((item) => ({
      id: item.mediaId,
      filename: `Mock ${item.mediaId}`,
      uploader: item.uploaderName,
      uploadTimestamp: item.uploadTimestamp,
      mediaType: item.mediaType,
      s3Key: item.s3Key,
      thumbnailKey: item.thumbnailKey,
      caption: item.caption,
      year: item.year,
    }))
    const nextOffset = offset + nextSlice.length
    const nextKey = nextOffset < mockMedia.length ? { offset: nextOffset } : null

    // Deduplicate items when appending
    setItems((prev) => {
      if (reset) return mappedItems
      const existingIds = new Set(prev.map(m => m.id))
      const newItems = mappedItems.filter(i => !existingIds.has(i.id))
      console.log('[Gallery] Mock fetch complete', { 
        fetchedCount: mappedItems.length, 
        newCount: newItems.length,
        duplicatesSkipped: mappedItems.length - newItems.length
      })
      return [...prev, ...newItems]
    })
    setLastKey(nextKey)
    setHasMore(Boolean(nextKey))
  }

  // Fetch media list from API
  const loadMedia = useCallback(async ({ reset, currentLastKey }: { reset?: boolean; currentLastKey?: Record<string, unknown> | null } = {}) => {
    // Request lock to prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('[Gallery] Media fetch skipped (locked)')
      return
    }
    if (!reset && !hasMore) {
      console.log('[Gallery] Media fetch skipped (no more items)')
      return
    }
    if (!reset && !currentLastKey && !lastKey) {
      console.log('[Gallery] Media fetch skipped (no pagination key)')
      return
    }

    console.log('[Gallery] Media fetch start', { reset, hasLastKey: Boolean(currentLastKey || lastKey) })
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
      params.set('t', Date.now().toString())
      const keyToUse = reset ? null : currentLastKey ?? lastKey
      if (!reset && keyToUse) {
        params.set('lastKey', encodeLastKey(keyToUse))
      }

      if (useMocks) {
        loadMockPage(reset)
        if (reset) {
          setLoading(false)
        } else {
          setLoadingMore(false)
        }
        isFetchingRef.current = false
        
        // Check scrollability after mock load
        requestAnimationFrame(() => {
          const isScrollable = document.body.scrollHeight > window.innerHeight
          if (!isScrollable && lastKey && !viewportFilledRef.current && !isFetchingRef.current) {
            console.log('[Gallery] Auto-filling viewport (not scrollable yet)')
            loadMedia({ currentLastKey: lastKey })
          } else if (isScrollable) {
            viewportFilledRef.current = true
            console.log('[Gallery] Viewport filled, auto-fill complete')
          }
        })
        return
      }

      const response = await fetch(`${getApiUrl('/media')}?${params.toString()}`)
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to fetch media')
      }
      const data = await response.json()
      const items = (data.items || []) as MediaItem[]
      const nextLastKey = data.lastKey && Object.keys(data.lastKey).length > 0 ? data.lastKey : null

      // Deduplicate items when appending
      setItems((prev) => {
        if (reset) return items
        const existingIds = new Set(prev.map(m => m.id))
        const newItems = items.filter(i => !existingIds.has(i.id))
        console.log('[Gallery] Media fetch complete', { 
          fetchedCount: items.length, 
          newCount: newItems.length,
          duplicatesSkipped: items.length - newItems.length
        })
        return [...prev, ...newItems]
      })
      setLastKey(nextLastKey)
      setHasMore(Boolean(nextLastKey))

      // Check scrollability after API load
      requestAnimationFrame(() => {
        const isScrollable = document.body.scrollHeight > window.innerHeight
        if (!isScrollable && nextLastKey && !viewportFilledRef.current && !isFetchingRef.current) {
          console.log('[Gallery] Auto-filling viewport (not scrollable yet)')
          loadMedia({ currentLastKey: nextLastKey })
        } else if (isScrollable) {
          viewportFilledRef.current = true
          console.log('[Gallery] Viewport filled, auto-fill complete')
        }
      })
    } catch (err) {
      console.error('Failed to load media:', err)
      loadMockPage(reset)
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

  // Load media on mount (always fetch fresh, only once)
  useEffect(() => {
    if (hasInitializedRef.current) {
      console.log('[Gallery] Mount effect skipped (already initialized)')
      return
    }
    hasInitializedRef.current = true
    
    console.log('[Gallery] Initial media fetch')
    viewportFilledRef.current = false
    setItems([])
    setGroupedMedia({})
    setLastKey(null)
    setHasMore(true)
    loadMedia({ reset: true })
  }, [])

  useEffect(() => {
    groupMediaByYear(items)
  }, [items])

  // Sync timeline with scroll position (closest year to top)
  useEffect(() => {
    const win = typeof globalThis !== 'undefined' ? (globalThis as unknown as Window) : undefined
    if (!win) return
    if (Object.keys(groupedMedia).length === 0) return

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current || isDraggingRef.current) return
      if (isScrollSettlingRef.current) {
        if (scrollSettleTimeoutRef.current) {
          clearTimeout(scrollSettleTimeoutRef.current)
        }
        scrollSettleTimeoutRef.current = setTimeout(() => {
          isScrollSettlingRef.current = false
        }, 250)
        return
      }
      if (scrollRafRef.current !== null) return

      scrollRafRef.current = win.requestAnimationFrame(() => {
        scrollRafRef.current = null

        const sections = Array.from(
          document.querySelectorAll<HTMLElement>('.year-section')
        )
          .map((section) => {
            const yearValue = section.dataset.year
            const parsedYear = yearValue ? parseInt(yearValue, 10) : NaN
            return { section, year: parsedYear }
          })
          .filter(({ year }) => Number.isFinite(year))

        if (sections.length === 0) return

        let closest = sections[0]
        let closestDistance = Math.abs(closest.section.getBoundingClientRect().top)

        sections.forEach((entry) => {
          const distance = Math.abs(entry.section.getBoundingClientRect().top)
          if (distance < closestDistance) {
            closestDistance = distance
            closest = entry
          }
        })

        if (closest.year !== currentYearRef.current) {
          setCurrentYear(closest.year)
        }
      })
    }

    handleScroll()
    win.addEventListener('scroll', handleScroll, { passive: true })
    win.addEventListener('resize', handleScroll)

    return () => {
      win.removeEventListener('scroll', handleScroll)
      win.removeEventListener('resize', handleScroll)
      if (scrollRafRef.current !== null) {
        win.cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [groupedMedia])

  // Scroll-based pagination (user-triggered)
  useEffect(() => {
    const win = typeof globalThis !== 'undefined' ? (globalThis as unknown as Window) : undefined
    if (!win) return

    const handleScroll = () => {
      // Only paginate on user scroll if viewport is already filled
      if (!viewportFilledRef.current || !hasMore || isFetchingRef.current) return

      const scrollPosition = win.scrollY + win.innerHeight
      const threshold = document.body.offsetHeight - 400
      const isNearBottom = scrollPosition >= threshold

      if (isNearBottom && lastKey) {
        console.log('[Gallery] Scroll pagination triggered', {
          scrollPosition,
          threshold,
          hasMore,
          viewportFilled: viewportFilledRef.current,
        })
        loadMedia({ currentLastKey: lastKey })
      }
    }

    win.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      win.removeEventListener('scroll', handleScroll)
    }
  }, [hasMore, lastKey, loadMedia])

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

  // Handle year selection from timeline
  const handleYearSelect = useCallback((year: number) => {
    setCurrentYear(year)
    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current)
    }

    const yearElement = document.getElementById(`year-${year}`)

    if (isDraggingRef.current) {
      // Disable smooth scrolling during drag to prevent feedback loops and jitter.
      pendingDragYearRef.current = year
      if (dragScrollRafRef.current === null) {
        dragScrollRafRef.current = requestAnimationFrame(() => {
          dragScrollRafRef.current = null
          const pendingYear = pendingDragYearRef.current
          if (!pendingYear) return
          const pendingElement = document.getElementById(`year-${pendingYear}`)
          if (pendingElement) {
            pendingElement.scrollIntoView({ behavior: 'auto', block: 'start' })
          }
        })
      }
      return
    }

    isProgrammaticScrollRef.current = true
    if (yearElement) {
      yearElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    scrollSyncTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false
    }, 600)
  }, [])

  const handleTimelineDragStart = useCallback(() => {
    isDraggingRef.current = true
    if (dragReleaseTimeoutRef.current) {
      clearTimeout(dragReleaseTimeoutRef.current)
    }
  }, [])

  const handleTimelineDragEnd = useCallback(() => {
    if (dragReleaseTimeoutRef.current) {
      clearTimeout(dragReleaseTimeoutRef.current)
    }
    dragReleaseTimeoutRef.current = setTimeout(() => {
      isDraggingRef.current = false
    }, 150)
    isScrollSettlingRef.current = true
    if (scrollSettleTimeoutRef.current) {
      clearTimeout(scrollSettleTimeoutRef.current)
    }
    scrollSettleTimeoutRef.current = setTimeout(() => {
      isScrollSettlingRef.current = false
    }, 250)
  }, [])

  // Get available years from grouped media
  const availableYears = Object.keys(groupedMedia)
    .filter(year => year !== 'Unknown Year')
    .map(year => parseInt(year))
    .sort((a, b) => a - b)

  return (
    <div className="gallery-page">
      <div className="gallery-container">
        <div className="gallery-memorial-banner">
          <span>Memorial Gathering · Feb 17 · 4pm · </span>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Tulip+Shop+Tavern+Portland"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tulip Shop Tavern
          </a>
        </div>
        <div className="gallery-actions">
          <button
            className="gallery-download-button"
            type="button"
            onClick={() => setArchiveModalOpen(true)}
          >
            Download All Photos
          </button>
        </div>
        {/* <h1>Gallery</h1> */}

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
              <section
                key={year}
                id={`year-${year}`}
                className="year-section"
                data-year={year}
              >
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
          allMedia={items}
          onClose={() => setSelectedMedia(null)}
          onNavigate={setSelectedMedia}
          onUpdate={updateMediaItem}
          onDelete={removeMediaItem}
        />
      )}
      
      {/* Timeline Slider */}
      <TimelineSlider 
        years={availableYears}
        currentYear={currentYear}
        onYearSelect={handleYearSelect}
        onDragStart={handleTimelineDragStart}
        onDragEnd={handleTimelineDragEnd}
      />

      <ArchiveDownloadModal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
      />
    </div>
  )
}

export default GalleryPage
