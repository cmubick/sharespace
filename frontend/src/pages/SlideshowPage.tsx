import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl, getMediaUrl } from '../services/api'
import '../styles/SlideshowPage.css'

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

type SortOrder = 'chronological' | 'random'

const SlideshowPage = () => {
  const navigate = useNavigate()
  const [media, setMedia] = useState<MediaItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)
  const [nextReady, setNextReady] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [autoplay, setAutoplay] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('chronological')
  const [uiVisible, setUiVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Timers
  const autoplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uiHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const HIDE_DELAY_MS = 2500
  const TRANSITION_MS = 900

  // Randomize media order
  const randomizeMedia = useCallback((items: MediaItem[]) => {
    return [...items].sort(() => Math.random() - 0.5)
  }, [])

  // Sort media chronologically
  const sortMediaChronologically = useCallback((items: MediaItem[]) => {
    return [...items].sort((a, b) => {
      const yearA = a.year || 9999
      const yearB = b.year || 9999
      return yearB - yearA
    })
  }, [])

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(getApiUrl('/media'))
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to fetch media')
      }
      const data = await response.json()
      const items = (data.items || []) as MediaItem[]

      const sorted = sortOrder === 'random'
        ? randomizeMedia(items)
        : sortMediaChronologically(items)

      setMedia(sorted)
      setCurrentIndex((prev) => (sorted.length === 0 ? 0 : Math.min(prev, sorted.length - 1)))
      setDisplayIndex(0)
      setPendingIndex(null)
      setNextReady(false)
    } catch (err) {
      console.error('Failed to load media:', err)
      setError('Failed to load slideshow')
    } finally {
      setLoading(false)
    }
  }, [randomizeMedia, sortMediaChronologically, sortOrder])

  // Load media data
  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  // Refetch when slideshow becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMedia()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchMedia])

  const scheduleHide = useCallback((interactionTime: number) => {
    if (uiHideTimerRef.current) {
      clearTimeout(uiHideTimerRef.current)
    }

    uiHideTimerRef.current = setTimeout(() => {
      if (Date.now() - interactionTime >= HIDE_DELAY_MS) {
        setUiVisible(false)
      }
    }, HIDE_DELAY_MS)
  }, [HIDE_DELAY_MS])

  const registerInteraction = useCallback(() => {
    const now = Date.now()
    setUiVisible(true)
    scheduleHide(now)
  }, [scheduleHide])

  useEffect(() => {
    const updateInitialVisibility = () => {
      if (window.innerWidth <= 768) {
        setUiVisible(false)
      }
    }

    updateInitialVisibility()
    window.addEventListener('resize', updateInitialVisibility)
    return () => window.removeEventListener('resize', updateInitialVisibility)
  }, [])

  useEffect(() => {
    const now = Date.now()
    setUiVisible(true)
    scheduleHide(now)
  }, [scheduleHide])

  // Handle sort order change
  const handleSortChange = useCallback(
    (newSort: SortOrder) => {
      setSortOrder(newSort)
      setCurrentIndex(0)
      setDisplayIndex(0)
      setPendingIndex(null)
      setNextReady(false)
      let sorted = media
      if (newSort === 'random') {
        sorted = randomizeMedia(media)
      } else {
        sorted = sortMediaChronologically(media)
      }
      setMedia(sorted)
    },
    [media, randomizeMedia, sortMediaChronologically]
  )

  // Handle mouse/touch movement to show UI
  useEffect(() => {
    const handleMouseMove = () => registerInteraction()
    const handleTouchStart = () => registerInteraction()

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [registerInteraction])

  // Navigation functions (declare before use in keyboard handler)
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % media.length)
    setAutoplay(false)
  }, [media.length])

  const previousSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
    setAutoplay(false)
  }, [media.length])

  // Autoplay logic
  useEffect(() => {
    if (autoplay && media.length > 0) {
      autoplayTimerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % media.length)
      }, 5000)
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current)
      }
    }
  }, [autoplay, media, currentIndex])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      registerInteraction()

      switch (e.key) {
        case 'ArrowRight':
        case 'n':
          nextSlide()
          break
        case 'ArrowLeft':
        case 'p':
          previousSlide()
          break
        case ' ':
          e.preventDefault()
          setAutoplay((prev) => !prev)
          break
        case 'r':
          handleSortChange('random')
          break
        case 'c':
          handleSortChange('chronological')
          break
        case 'Escape':
          navigate('/gallery')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [registerInteraction, navigate, handleSortChange, nextSlide, previousSlide])

  // Prevent scrolling in fullscreen
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const toggleAutoplay = useCallback(() => {
    setAutoplay((prev) => !prev)
  }, [])

  useEffect(() => {
    if (autoplay) {
      const now = Date.now()
      setUiVisible(true)
      scheduleHide(now)
    }
  }, [autoplay, scheduleHide])

  const resolveMediaUrl = useCallback((s3Key: string) => getMediaUrl(s3Key), [])

  useEffect(() => {
    if (media.length === 0) return
    if (currentIndex === displayIndex) return
    setPendingIndex(currentIndex)
    setNextReady(false)
  }, [currentIndex, displayIndex, media.length])

  useEffect(() => {
    if (pendingIndex === null) return
    const nextItem = media[pendingIndex]
    if (!nextItem) return

    const nextUrl = resolveMediaUrl(nextItem.s3Key)

    if (nextItem.mediaType.startsWith('image/')) {
      const img = new Image()
      img.onload = () => setNextReady(true)
      img.src = nextUrl
      return () => {
        img.onload = null
      }
    }

    if (nextItem.mediaType.startsWith('video/')) {
      const video = document.createElement('video')
      const handleLoaded = () => setNextReady(true)
      video.preload = 'auto'
      video.src = nextUrl
      video.addEventListener('loadeddata', handleLoaded)
      video.load()
      return () => {
        video.removeEventListener('loadeddata', handleLoaded)
      }
    }

    setNextReady(true)
  }, [pendingIndex, media, resolveMediaUrl])

  useEffect(() => {
    if (pendingIndex === null || !nextReady) return
    setIsTransitioning(true)
    const timer = setTimeout(() => {
      setDisplayIndex(pendingIndex)
      setPendingIndex(null)
      setIsTransitioning(false)
    }, TRANSITION_MS)

    return () => clearTimeout(timer)
  }, [pendingIndex, nextReady, TRANSITION_MS])

  useEffect(() => {
    if (media.length === 0) return
    const nextIndex = (displayIndex + 1) % media.length
    const nextItem = media[nextIndex]
    if (!nextItem || !nextItem.mediaType.startsWith('image/')) return
    const img = new Image()
    img.src = resolveMediaUrl(nextItem.s3Key)
  }, [displayIndex, media, resolveMediaUrl])

  if (loading) {
    return (
      <div className="slideshow-page loading">
        <div className="spinner"></div>
        <p>Loading slideshow...</p>
      </div>
    )
  }

  if (error || media.length === 0) {
    return (
      <div className="slideshow-page error">
        <div className="error-content">
          <p>{error || 'No media available for slideshow'}</p>
          <button onClick={() => navigate('/gallery')} className="btn-back">
            Back to Gallery
          </button>
        </div>
      </div>
    )
  }

  const currentMedia = media[displayIndex]
  const nextMedia = pendingIndex !== null ? media[pendingIndex] : null
  const isVideo = currentMedia.mediaType.startsWith('video/')

  return (
    <div className="slideshow-page">
      {/* Media Display */}
      <div className="slideshow-media">
        <div className={`media-layer ${isTransitioning ? 'fade-out' : 'fade-in'}`}>
          {isVideo ? (
            <video
              ref={videoRef}
              src={resolveMediaUrl(currentMedia.s3Key)}
              autoPlay
              muted
              loop
              className="slideshow-video"
            />
          ) : (
            <>
              <div
                className="media-backdrop"
                style={{ backgroundImage: `url(${resolveMediaUrl(currentMedia.s3Key)})` }}
              />
              <img
                src={resolveMediaUrl(currentMedia.s3Key)}
                alt={currentMedia.filename}
                className="slideshow-image"
              />
            </>
          )}
        </div>
        {nextMedia && (
          <div className={`media-layer ${nextReady ? 'fade-in' : 'fade-preload'}`}>
            {nextMedia.mediaType.startsWith('video/') ? (
              <video
                src={resolveMediaUrl(nextMedia.s3Key)}
                autoPlay
                muted
                loop
                className="slideshow-video"
              />
            ) : (
              <>
                <div
                  className="media-backdrop"
                  style={{ backgroundImage: `url(${resolveMediaUrl(nextMedia.s3Key)})` }}
                />
                <img
                  src={resolveMediaUrl(nextMedia.s3Key)}
                  alt={nextMedia.filename}
                  className="slideshow-image"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* UI Controls */}
      <div className={`slideshow-controls ${uiVisible ? 'visible' : 'hidden'}`}>
        {/* Top Bar */}
        <div className="controls-top">
          <div className="media-title">{currentMedia.filename}</div>
          <div className="controls-buttons">
            <button
              className="control-btn sort-btn"
              onClick={() =>
                handleSortChange(sortOrder === 'random' ? 'chronological' : 'random')
              }
              title={`Sort: ${sortOrder} (C/R)`}
            >
              {sortOrder === 'random' ? '🔀' : '📅'}
            </button>
            <button
              className="control-btn close-btn"
              onClick={() => navigate('/gallery')}
              title="Back to Gallery (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Center Controls */}
        <div className="controls-center">
          <button
            className="control-btn nav-btn prev"
            onClick={previousSlide}
            title="Previous (←/P)"
          >
            ‹
          </button>

          <div className="center-info">
            <div className="media-counter">
              {currentIndex + 1} / {media.length}
            </div>
            <button
              className={`control-btn autoplay-btn ${autoplay ? 'active' : ''}`}
              onClick={toggleAutoplay}
              title="Toggle Autoplay (Space)"
            >
              {autoplay ? '⏸' : '▶'}
            </button>
          </div>

          <button
            className="control-btn nav-btn next"
            onClick={nextSlide}
            title="Next (→/N)"
          >
            ›
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="controls-bottom">
          <div className="media-info">
            <div className="info-row">
              <span className="label">By:</span>
              <span className="value">{currentMedia.uploader}</span>
            </div>
            {currentMedia.caption && (
              <div className="info-row">
                <span className="label">Caption:</span>
                <span className="value">{currentMedia.caption}</span>
              </div>
            )}
            {currentMedia.year && (
              <div className="info-row">
                <span className="label">Year:</span>
                <span className="value">{currentMedia.year}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`slideshow-progress ${uiVisible ? 'visible' : ''}`}>
        <div className="progress-fill" style={{ width: `${((currentIndex + 1) / media.length) * 100}%` }}></div>
      </div>

      {/* Keyboard Hints (show briefly on load) */}
      {uiVisible && (
        <div className="keyboard-hints">
          <div className="hints-content">
            <p>
              <strong>Keyboard Controls:</strong> ← → Previous/Next | Space Autoplay | C/R Sort | Esc Exit
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SlideshowPage
