import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { Readable } from 'stream'
import * as fs from 'fs'
import archiver from 'archiver'
import path from 'path'
import { createErrorResponse, createOptionsResponse, createSuccessResponse } from '../../shared/utils'

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
const ARCHIVE_KEY = 'archives/photos-latest.zip'
const ARCHIVE_FOLDER = 'Justin-Fowler-Gallery'
const PRESIGNED_URL_EXPIRY = 3600

interface MediaItem {
  mediaId: string
  s3Key: string
  mediaType: string
  uploaderName?: string
  caption?: string
  year?: number
}

const sanitizeSegment = (value: string, fallback: string): string => {
  const normalized = (value || '').trim() || fallback
  return normalized
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    || fallback
}

const buildArchiveFileName = (item: MediaItem): string => {
  const yearPart = typeof item.year === 'number' ? String(item.year) : 'unknown-year'
  const captionPart = sanitizeSegment(item.caption || 'photo', 'photo')
  const uploaderPart = sanitizeSegment(item.uploaderName || 'unknown', 'unknown')
  const extension = path.extname(item.s3Key || '').toLowerCase() || '.jpg'
  return `${yearPart}-${captionPart}-${uploaderPart}${extension}`
}

const getArchiveDownloadUrl = async () => {
  const getCommand = new GetObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: ARCHIVE_KEY,
  })
  return getSignedUrl(s3Client, getCommand, { expiresIn: PRESIGNED_URL_EXPIRY })
}

const scanAllPhotos = async (): Promise<MediaItem[]> => {
  let items: MediaItem[] = []
  let lastEvaluatedKey: Record<string, any> | undefined

  do {
    const scanResult = await dynamoDb.send(
      new ScanCommand({
        TableName: MEDIA_TABLE,
        FilterExpression: '#mediaType = :mediaType',
        ExpressionAttributeNames: {
          '#mediaType': 'mediaType',
        },
        ExpressionAttributeValues: {
          ':mediaType': 'image',
        },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    )

    const batch = (scanResult.Items || []) as (MediaItem & { hidden?: boolean })[]
    items = items.concat(batch.filter((item) => item.s3Key && !item.hidden))
    lastEvaluatedKey = scanResult.LastEvaluatedKey
  } while (lastEvaluatedKey)

  return items
}

const buildArchive = async (items: MediaItem[]) => {
  const tmpPath = '/tmp/photos.zip'
  const archiveStream = archiver('zip', { zlib: { level: 9 } })
  const output = fs.createWriteStream(tmpPath)

  archiveStream.pipe(output)

  for (const item of items) {
    try {
      const getResult = await s3Client.send(
        new GetObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: item.s3Key,
        })
      )

      if (!getResult.Body) {
        continue
      }

      const fileName = buildArchiveFileName(item)
      const entryName = `${ARCHIVE_FOLDER}/${fileName}`
      
      // Convert SDK v3 stream to Node.js Readable
      const bodyStream = getResult.Body as Readable
      archiveStream.append(bodyStream, { name: entryName })
    } catch (err) {
      console.error('Failed to append file to archive', {
        mediaId: item.mediaId,
        s3Key: item.s3Key,
        error: err,
      })
    }
  }

  // Wait for archive file to be written completely
  await new Promise<void>((resolve, reject) => {
    output.on('close', resolve)
    output.on('error', reject)
    archiveStream.on('error', reject)
    archiveStream.finalize()
  })

  // Upload the completed file to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: ARCHIVE_KEY,
      Body: fs.createReadStream(tmpPath),
      ContentType: 'application/zip',
    })
  )
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return createOptionsResponse()
    }

    console.log('Archive request received', {
      requestId: context.awsRequestId,
      path: event.path,
      method: event.httpMethod,
    })

    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: ARCHIVE_KEY,
        })
      )

      const downloadUrl = await getArchiveDownloadUrl()
      return createSuccessResponse({ downloadUrl, cached: true })
    } catch (err) {
      console.log('Archive not found, rebuilding', { error: err })
    }

    const items = await scanAllPhotos()
    if (items.length === 0) {
      return createErrorResponse(new Error('No photos available to archive'), 404)
    }

    await buildArchive(items)
    const downloadUrl = await getArchiveDownloadUrl()

    return createSuccessResponse({ downloadUrl, cached: false })
  } catch (error) {
    console.error('Archive generation error', error, {
      requestId: context.awsRequestId,
    })

    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to generate archive'),
      500
    )
  }
}