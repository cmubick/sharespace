/**
 * API configuration and base URL
 */

// Get API endpoint from environment or use relative path for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const apiConfig = {
  baseUrl: API_BASE_URL,
}

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}
