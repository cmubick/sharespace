/**
 * Shared utility functions for Lambda handlers
 */

export const createSuccessResponse = (data: any, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify(data),
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
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
  },
})

export const validateRequiredFields = (obj: Record<string, any>, fields: string[]): string[] => {
  return fields.filter(field => !obj[field])
}
