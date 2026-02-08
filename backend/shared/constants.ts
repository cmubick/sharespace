/**
 * Application constants
 */

export const CONSTANTS = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf'],
  API_TIMEOUT: 30000, // 30 seconds
}

export const ENVIRONMENT = {
  region: process.env.AWS_REGION || 'us-east-1',
  environment: process.env.ENVIRONMENT || 'development',
  debug: process.env.DEBUG === 'true',
}
