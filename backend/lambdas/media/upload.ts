import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { createSuccessResponse, createErrorResponse, validateRequiredFields } from '../../shared/utils'

// AWS clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
})
const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-west-2',
  })
)

const MEDIA_BUCKET = process.env.MEDIA_BUCKET || 'sharespace-media'
const MEDIA_TABLE = process.env.MEDIA_TABLE || 'sharespace-media-table'
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024 // 25MB default
const PRESIGNED_URL_EXPIRY = 3600 // 1 hour

interface UploadRequest {
  filename: string
  fileType: string
  uploaderName: string
  userId: string
  caption?: string
  year?: number
}

interface UploadResponse {
  mediaId: string
  s3Key: string
  presignedUrl: string
  expiresIn: number
  uploadSizeLimit: number
}

interface MediaMetadata {
  mediaId: string
  userId: string
  filename: string
  uploader: string
  uploadTimestamp: string
  mediaType: string
  s3Key: string
  caption?: string
  year?: number
}

/**
 * Generate pre-signed S3 upload URL and store metadata in DynamoDB
 * Accepts: filename, fileType, uploaderName, caption (optional), year (optional)
 * Returns: mediaId, s3Key, presignedUrl, expiresIn, uploadSizeLimit
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Upload initiation request:', {
      requestId: context.awsRequestId,
      path: event.path,
      method: event.httpMethod,
    })

    // Parse request body
    let uploadRequest: UploadRequest
    try {
      uploadRequest = JSON.parse(event.body || '{}')
    } catch (err) {
      console.error('Failed to parse request body:', err)
      return createErrorResponse(
        new Error('Invalid JSON in request body'),
        400
      )
    }

    // Validate required fields
    const missingFields = validateRequiredFields(uploadRequest, [
      'filename',
      'fileType',
      'uploaderName',
      'userId',
    ])
    if (missingFields.length > 0) {
      return createErrorResponse(
        new Error(`Missing required fields: ${missingFields.join(', ')}`),
        400
      )
    }

    const { filename, fileType, uploaderName, userId, caption, year } = uploadRequest

    // Validate filename
    if (typeof filename !== 'string' || filename.trim().length === 0) {
      return createErrorResponse(new Error('Filename must be a non-empty string'), 400)
    }

    // Validate fileType
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']
    if (!allowedTypes.includes(fileType)) {
      return createErrorResponse(
        new Error(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        ),
        400
      )
    }

    // Validate uploaderName
    if (typeof uploaderName !== 'string' || uploaderName.trim().length === 0) {
      return createErrorResponse(
        new Error('Uploader name must be a non-empty string'),
        400
      )
    }

    // Validate optional year
    if (year !== undefined && (typeof year !== 'number' || year < 1900 || year > 2100)) {
      return createErrorResponse(
        new Error('Year must be between 1900 and 2100'),
        400
      )
    }

    // Generate unique media ID and S3 object key
    const mediaId = uuidv4()
    const timestamp = new Date().toISOString()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const s3Key = `uploads/${mediaId}/${sanitizedFilename}`

    console.log('Generating pre-signed URL:', {
      mediaId,
      s3Key,
      fileType,
      uploaderName,
    })

    // Generate pre-signed PUT URL
    const putCommand = new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: s3Key,
      ContentType: fileType,
      Metadata: {
        'upload-limit': MAX_UPLOAD_SIZE.toString(),
        'media-id': mediaId,
        'uploader': uploaderName,
      },
    })

    const presignedUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    })

    // Store metadata in DynamoDB
    const mediaMetadata: MediaMetadata & { uploadedAt: string } = {
      mediaId,
      userId,
      filename,
      uploader: uploaderName,
      uploadTimestamp: timestamp,
      uploadedAt: timestamp,
      mediaType: fileType,
      s3Key,
      ...(caption && { caption }),
      ...(year && { year }),
    }

    console.log('Storing metadata in DynamoDB:', mediaMetadata)

    await dynamoDb.send(
      new PutCommand({
        TableName: MEDIA_TABLE,
        Item: mediaMetadata,
      })
    )

    const response: UploadResponse = {
      mediaId,
      s3Key,
      presignedUrl,
      expiresIn: PRESIGNED_URL_EXPIRY,
      uploadSizeLimit: MAX_UPLOAD_SIZE,
    }

    console.log('Upload URL generated successfully:', {
      mediaId,
      expiresIn: PRESIGNED_URL_EXPIRY,
    })

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Upload initiation error:', error)

    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to generate upload URL'),
      500
    )
  }
}
