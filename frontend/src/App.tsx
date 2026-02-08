import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import UploadPage from './pages/UploadPage'
import GalleryPage from './pages/GalleryPage'
import SlideshowPage from './pages/SlideshowPage'
import './App.css'

function AppContent() {
  const navigate = useNavigate()
  const hasAccess = localStorage.getItem('sharespace_access') === 'true'

  const handleLogout = () => {
    localStorage.removeItem('sharespace_access')
    navigate('/login')
  }

  return (
    <div className="app">
      {hasAccess && (
        <header className="app-header">
          <h1>ShareSpace</h1>
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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="app-container">
                <h2>Welcome to ShareSpace</h2>
                <p>You are now logged in. Start by uploading media or viewing the gallery.</p>
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
