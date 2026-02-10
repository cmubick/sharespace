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

export type MediaType = 'image' | 'video' | 'audio'

export interface MediaRecord {
  pk: 'MEDIA'
  sk: string
  mediaId: string
  s3Key: string
  mediaType: MediaType
  uploaderName: string
  caption?: string
  year?: number
  originalYear?: number
  uploadTimestamp: string
  fileSize: number
  album?: string
  hidden?: boolean
  hiddenReason?: string
  flaggedBy?: string
  flaggedAt?: string
}

export interface MediaCreateRequest {
  filename: string
  fileType: string
  fileSize: number
  uploaderName: string
  caption?: string
  year?: number
  originalYear?: number
  album?: string
}

export interface ApiResponse<T> {
  statusCode: number
  body: T
  headers?: Record<string, string>
}
