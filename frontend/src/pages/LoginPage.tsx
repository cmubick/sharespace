import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/LoginPage.css'

const LoginPage = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const correctPassword = import.meta.env.VITE_APP_PASSWORD || 'shitbird'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password === correctPassword) {
      localStorage.setItem('sharespace_access', 'true')
      navigate('/')
    } else {
      setError('Incorrect password. Try again.')
      setPassword('')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>ShareSpace</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
            />
            <p className="hint">Hint: {import.meta.env.VITE_PASSWORD_HINT || "Vladamir's nickname"}</p>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-button">
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
