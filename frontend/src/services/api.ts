/**
 * API configuration and base URL
 */

// Get API endpoint from environment or use relative path for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'https://media.domain.com'

export const apiConfig = {
  baseUrl: API_BASE_URL,
}

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export function getMediaUrl(s3Key: string): string {
  if (!MEDIA_BASE_URL) {
    return s3Key
  }
  const normalizedBase = MEDIA_BASE_URL.replace(/\/$/, '')
  const normalizedKey = s3Key.replace(/^\//, '')
  return `${normalizedBase}/${normalizedKey}`
}
