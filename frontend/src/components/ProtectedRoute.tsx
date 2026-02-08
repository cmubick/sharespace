import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const hasAccess = localStorage.getItem('sharespace_access') === 'true'

  if (!hasAccess) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
