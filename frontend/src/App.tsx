import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom'
import { clearSession } from './services/auth'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import UploadPage from './pages/UploadPage'
import GalleryPage from './pages/GalleryPage'
import SlideshowPage from './pages/SlideshowPage'
import './App.css'

function AppContent() {
  const navigate = useNavigate()
  const hasAccess = localStorage.getItem('sharespace_access') === 'true'
  const [logoFailed, setLogoFailed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => {
    clearSession()
    localStorage.removeItem('sharespace_access')
    navigate('/login')
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
        <p>
          Listen to: <a href="https://woodenindianburialground.bandcamp.com/" target="_blank" rel="noopener noreferrer">W.I.B.G.</a>
        </p>
      </footer>
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
