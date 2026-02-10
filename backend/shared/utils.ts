/**
 * Shared utility functions for Lambda handlers
 */

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://itsonlycastlesburning.com',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
}

export const createSuccessResponse = (data: any, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify(data),
  headers: corsHeaders,
})

export const createErrorResponse = (error: any, statusCode = 500) => ({
  statusCode,
  body: JSON.stringify({
    error: error.message || 'Internal server error',
  }),
  headers: corsHeaders,
})

export const createOptionsResponse = () => ({
  statusCode: 200,
  body: '',
  headers: corsHeaders,
})

export const validateRequiredFields = (obj: Record<string, any>, fields: string[]): string[] => {
  return fields.filter(field => !obj[field])
}
