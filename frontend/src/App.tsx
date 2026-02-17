import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom'
import { clearSession } from './services/auth'
import { getApiUrl } from './services/api'
import FeedbackModal from './components/FeedbackModal'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import UploadPage from './pages/UploadPage'
import GalleryPage from './pages/GalleryPage'
import SlideshowPage from './pages/SlideshowPage'
import './App.css'

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const hasAccess = localStorage.getItem('sharespace_access') === 'true'
  const [logoFailed, setLogoFailed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [updatesEmail, setUpdatesEmail] = useState('')
  const [updatesParticipate, setUpdatesParticipate] = useState(false)
  const [updatesInstrument, setUpdatesInstrument] = useState('')
  const [updatesSubmitting, setUpdatesSubmitting] = useState(false)
  const [updatesStatus, setUpdatesStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [updatesError, setUpdatesError] = useState('')

  const handleLogout = () => {
    clearSession()
    localStorage.removeItem('sharespace_access')
    navigate('/login')
  }

  const scrollToCelebrationUpdates = () => {
    const target = document.getElementById('celebration-updates')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleCelebrationUpdatesNav = () => {
    setDrawerOpen(false)
    if (window.location.pathname !== '/') {
      navigate('/#celebration-updates')
      return
    }
    window.location.hash = 'celebration-updates'
    scrollToCelebrationUpdates()
  }

  const handleUpdatesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!updatesEmail.trim()) {
      setUpdatesError('Please enter your email address.')
      return
    }

    setUpdatesSubmitting(true)
    setUpdatesError('')

    const message = [
      'Celebration of Life Update Signup',
      '',
      `Email: ${updatesEmail.trim()}`,
      `Participation interest: ${updatesParticipate ? 'Yes' : 'No'}`,
      `Notes: ${updatesInstrument.trim() || 'None provided'}`,
    ].join('\n')

    try {
      const response = await fetch(getApiUrl('/feedback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          email: updatesEmail.trim(),
          subject: 'Celebration of Life Update Signup',
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit updates signup')
      }

      setUpdatesStatus('success')
      setUpdatesEmail('')
      setUpdatesParticipate(false)
      setUpdatesInstrument('')
    } catch (err) {
      console.error('Updates signup error:', err)
      setUpdatesStatus('error')
      setUpdatesError('Unable to submit right now. Please try again.')
    } finally {
      setUpdatesSubmitting(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
      }
    }

    if (drawerOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  useEffect(() => {
    if (location.hash === '#celebration-updates') {
      window.requestAnimationFrame(() => {
        scrollToCelebrationUpdates()
      })
    }
  }, [location.hash])

  return (
    <div className="app">
      {hasAccess && (
        <header className="app-header">
          <div className="brand">
            <Link to="/" className="brand-link" onClick={() => setDrawerOpen(false)}>
              {logoFailed ? (
                <span className="brand-fallback">JDF</span>
              ) : (
                <img
                  src="/assets/jdf.svg"
                  alt="JDF"
                  className="brand-logo"
                  onError={() => setLogoFailed(true)}
                />
              )}
            </Link>
          </div>
          <button
            className="hamburger"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
          <nav className="app-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/upload" className="nav-link">Upload</Link>
            <Link to="/gallery" className="nav-link">Gallery</Link>
            <Link to="/slideshow" className="nav-link">Slideshow</Link>
            <button className="nav-link nav-button" onClick={handleCelebrationUpdatesNav}>
              Celebration Updates
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </header>
      )}
      {hasAccess && drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="drawer">
            <nav className="drawer-nav">
              <Link to="/upload" className="drawer-link" onClick={() => setDrawerOpen(false)}>
                Upload Media
              </Link>
              <Link to="/gallery" className="drawer-link" onClick={() => setDrawerOpen(false)}>
                View Gallery
              </Link>
              <Link to="/slideshow" className="drawer-link" onClick={() => setDrawerOpen(false)}>
                Slideshow Mode
              </Link>
              <button className="drawer-link" onClick={handleCelebrationUpdatesNav}>
                Celebration Updates
              </button>
              <button
                className="drawer-link"
                onClick={() => {
                  setDrawerOpen(false)
                  setFeedbackModalOpen(true)
                }}
              >
                Send Feedback
              </button>
              <button className="drawer-link drawer-logout" onClick={() => { setDrawerOpen(false); handleLogout() }}>
                Logout
              </button>
            </nav>
          </aside>
        </>
      )}
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="app-container home-hero">
                  <div className="home-hero-bg" aria-hidden="true">
                    <div className="corner-decor corner-left" />
                    <div className="corner-decor corner-right" />
                  </div>
                  <div className="home-hero-flyer">
                    <img
                      src="/assets/flyer-medium.jpg"
                      srcSet="/assets/flyer-small.jpg 600w, /assets/flyer-medium.jpg 900w, /assets/flyer-large.jpg 1600w"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1100px"
                      alt="Memorial gathering flyer for Justin D. Fowler"
                      className="memorial-flyer"
                    />
                  </div>
                  <div className="home-hero-content">
                    <div className="memorial-card">
                      <p className="memorial-kicker">Memorial Gathering</p>
                      <h3 className="memorial-title">Remembering Justin D. Fowler</h3>
                      <p className="memorial-details">Tuesday, February 17th · 4pm</p>
                      <p className="memorial-venue">
                        <a
                          href="https://www.google.com/maps/search/?api=1&query=Tulip+Shop+Tavern+Portland"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Tulip Shop Tavern
                        </a>
                      </p>
                      <p className="memorial-address">825 N Killingsworth St, Portland, OR</p>
                    </div>
                    <p>
                      This space is for everyone who knew and loved Justin
                      to share some photos so we can
                      remember him together.
                      <br />
                      <br />
                      Please upload anything you&apos;d like to share.
                    </p>
                    <div className="home-actions">
                      <Link to="/upload" className="action-button">Upload Media</Link>
                      <Link to="/gallery" className="action-button">View Gallery</Link>
                      <Link to="/slideshow" className="action-button">Slideshow Mode</Link>
                    </div>
                    <div className="home-footer">Site in progress — thank you for helping test and improve it.</div>
                  </div>
                  <section id="celebration-updates" className="celebration-updates">
                    <h3>Future Celebration of Life at Cherry Sprout Park</h3>
                    <p>
                      We’re planning a larger community celebration of Justin’s
                      life at Cherry Sprout Park later this spring or summer,
                      with friends gathering to share memories and music.
                    </p>
                    <p>
                      If you’d like to hear when details are finalized, leave
                      your email and we’ll share updates as plans come together.
                    </p>
                    <p>
                      If you’re a musician and might like to play or participate,
                      let us know below — we’d love to include friends who want
                      to share music in Justin’s honor.
                    </p>
                    <p>No spam, just event details when we have them.</p>

                    {updatesStatus === 'success' ? (
                      <div className="celebration-updates-success">
                        Thank you. We’ll share updates as plans come together.
                      </div>
                    ) : (
                      <form className="celebration-updates-form" onSubmit={handleUpdatesSubmit}>
                        <label htmlFor="celebration-email">Email *</label>
                        <input
                          id="celebration-email"
                          type="email"
                          value={updatesEmail}
                          onChange={(e) => setUpdatesEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          disabled={updatesSubmitting}
                        />

                        <label className="celebration-checkbox">
                          <input
                            type="checkbox"
                            checked={updatesParticipate}
                            onChange={(e) => setUpdatesParticipate(e.target.checked)}
                            disabled={updatesSubmitting}
                          />
                          I might like to play music or participate
                        </label>

                        <label htmlFor="celebration-instrument">Notes (optional)</label>
                        <input
                          id="celebration-instrument"
                          type="text"
                          value={updatesInstrument}
                          onChange={(e) => setUpdatesInstrument(e.target.value)}
                          placeholder="Your name, band name, or anything you'd like us to know"
                          disabled={updatesSubmitting}
                        />

                        {updatesError && (
                          <div className="celebration-updates-error">{updatesError}</div>
                        )}

                        <button
                          type="submit"
                          className="celebration-updates-submit"
                          disabled={updatesSubmitting}
                        >
                          {updatesSubmitting ? 'Sending...' : 'Get Updates'}
                        </button>
                      </form>
                    )}
                  </section>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <GalleryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/slideshow"
            element={
              <ProtectedRoute>
                <SlideshowPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-footer-content">
          <p>
            Listen to: <a href="https://woodenindianburialground.bandcamp.com/" target="_blank" rel="noopener noreferrer">W.I.B.G.</a>
          </p>
          <button
            className="feedback-footer-link"
            onClick={() => setFeedbackModalOpen(true)}
          >
            Send feedback or report an issue
          </button>
        </div>
      </footer>
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
