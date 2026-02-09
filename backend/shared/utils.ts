/**
 * Shared utility functions for Lambda handlers
 */

export const createSuccessResponse = (data: any, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify(data),
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
})

export const createErrorResponse = (error: any, statusCode = 500) => ({
  statusCode,
  body: JSON.stringify({
    error: error.message || 'Internal server error',
  }),
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
})

export const validateRequiredFields = (obj: Record<string, any>, fields: string[]): string[] => {
  return fields.filter(field => !obj[field])
}
