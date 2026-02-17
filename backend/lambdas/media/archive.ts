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
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
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

const lambdaClient = new LambdaClient({
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
const BUILDING_MARKER_KEY = 'archives/building.marker'
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

const makeUniqueFileName = (baseName: string, usedNames: Map<string, number>): string => {
  // Check if name already exists
  if (!usedNames.has(baseName)) {
    usedNames.set(baseName, 0)
    return baseName
  }

  // Parse extension and base
  const lastDotIndex = baseName.lastIndexOf('.')
  let nameWithoutExt: string
  let extension: string

  if (lastDotIndex > 0) {
    nameWithoutExt = baseName.substring(0, lastDotIndex)
    extension = baseName.substring(lastDotIndex)
  } else {
    nameWithoutExt = baseName
    extension = ''
  }

  // Find next available number
  let counter = (usedNames.get(baseName) || 0) + 1
  let uniqueName: string

  while (true) {
    uniqueName = `${nameWithoutExt} (${counter})${extension}`
    if (!usedNames.has(uniqueName)) {
      usedNames.set(baseName, counter)
      usedNames.set(uniqueName, 0)
      return uniqueName
    }
    counter++
  }
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
  const usedFileNames = new Map<string, number>()

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

      const baseFileName = buildArchiveFileName(item)
      const uniqueFileName = makeUniqueFileName(baseFileName, usedFileNames)
      const entryName = `${ARCHIVE_FOLDER}/${uniqueFileName}`
      
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

  // Remove building marker
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: BUILDING_MARKER_KEY,
      })
    )
  } catch (err) {
    console.warn('Failed to delete building marker', err)
  }
}

const checkIfBuilding = async (): Promise<boolean> => {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: BUILDING_MARKER_KEY,
      })
    )
    return true
  } catch {
    return false
  }
}

const checkIfArchiveExists = async (): Promise<boolean> => {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: ARCHIVE_KEY,
      })
    )
    return true
  } catch {
    return false
  }
}

const createBuildingMarker = async () => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: BUILDING_MARKER_KEY,
      Body: Buffer.from(new Date().toISOString()),
      ContentType: 'text/plain',
    })
  )
}

const triggerAsyncBuild = async (context: Context) => {
  const functionName = context.functionName
  const payload = {
    source: 'internal',
    action: 'build',
  }

  try {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'Event', // Async invoke
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    )
  } catch (err) {
    console.error('Failed to trigger async build', err)
    throw err
  }
}

const performBuild = async () => {
  console.log('Starting archive build')
  
  const items = await scanAllPhotos()
  if (items.length === 0) {
    throw new Error('No photos available to archive')
  }

  await buildArchive(items)
  console.log('Archive build completed')
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
      source: (event as any).source,
    })

    // Handle internal async build invocation
    if ((event as any).source === 'internal' && (event as any).action === 'build') {
      console.log('Processing internal build request')
      await performBuild()
      return createSuccessResponse({ message: 'Build completed' })
    }

    // GET /media/archive/status - Check status
    if (event.httpMethod === 'GET' && event.path?.includes('/status')) {
      const archiveExists = await checkIfArchiveExists()
      
      if (archiveExists) {
        const downloadUrl = await getArchiveDownloadUrl()
        return createSuccessResponse({ 
          status: 'ready', 
          url: downloadUrl 
        })
      }

      return createSuccessResponse({ status: 'building' })
    }

    // POST /media/archive - Trigger or check build
    if (event.httpMethod === 'POST') {
      // Check if archive already exists
      const archiveExists = await checkIfArchiveExists()
      if (archiveExists) {
        const downloadUrl = await getArchiveDownloadUrl()
        return createSuccessResponse({ 
          status: 'ready', 
          url: downloadUrl 
        })
      }

      // Check if already building
      const isBuilding = await checkIfBuilding()
      if (isBuilding) {
        return createSuccessResponse({ status: 'building' })
      }

      // Start new build
      await createBuildingMarker()
      await triggerAsyncBuild(context)
      
      return createSuccessResponse({ status: 'building' })
    }

    return createErrorResponse(new Error('Method not allowed'), 405)
  } catch (error) {
    console.error('Archive handler error', error, {
      requestId: context.awsRequestId,
    })

    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to process archive request'),
      500
    )
  }
}