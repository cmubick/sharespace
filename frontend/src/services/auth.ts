/**
 * Auth utilities for ShareSpace
 * Handles session-based userId management
 */

const USER_ID_KEY = 'sharespace_user_id'
const SESSION_ID_KEY = 'sharespace_session_id'

/**
 * Get or create a unique user ID for this session
 * Uses localStorage to persist the ID across page refreshes
 */
export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY)
  
  if (!userId) {
    // Generate a new user ID based on timestamp and random component
    userId = generateUserId()
    localStorage.setItem(USER_ID_KEY, userId)
  }
  
  return userId
}

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `user-${timestamp}-${random}`
}

/**
 * Clear user session (called on logout)
 */
export function clearSession(): void {
  localStorage.removeItem(USER_ID_KEY)
  localStorage.removeItem(SESSION_ID_KEY)
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return localStorage.getItem('sharespace_access') === 'true'
}
