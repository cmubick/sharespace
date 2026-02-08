import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
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
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
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
                <p>You are now logged in.</p>
              </div>
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
