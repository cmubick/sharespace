/**
 * Shared types used across Lambda functions
 */

export interface ShareSpaceUser {
  id: string
  email: string
  displayName: string
  createdAt: string
}

export interface MediaItem {
  id: string
  userId: string
  name: string
  url: string
  type: 'image' | 'video' | 'document'
  size: number
  uploadedAt: string
}

export interface ApiResponse<T> {
  statusCode: number
  body: T
  headers?: Record<string, string>
}
