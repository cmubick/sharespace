import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { S3Event } from 'aws-lambda'
import sharp from 'sharp'
import { Readable } from 'stream'

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
const MAX_THUMBNAIL_SIZE = 400

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

    if (!bucket || !key) {
      console.log('Skipping record with missing bucket or key')
      continue
    }

    if (key.startsWith('thumbnails/')) {
      console.log(`Skipping thumbnail object: ${key}`)
      continue
    }

    const lowerKey = key.toLowerCase()
    const isImage = allowedExtensions.some((ext) => lowerKey.endsWith(ext))
    if (!isImage) {
      console.log(`Skipping non-image object: ${key}`)
      continue
    }

    const filename = key.split('/').pop() || key
    const baseName = filename.replace(/\.[^.]+$/, '')
    const thumbnailKey = `thumbnails/${baseName}.jpg`

    const keyParts = key.split('/').filter(Boolean)
    const uploadsIndex = keyParts.indexOf('uploads')
    const mediaId = uploadsIndex >= 0 ? keyParts[uploadsIndex + 1] : undefined

    if (!mediaId) {
      console.log(`Unable to extract mediaId from key: ${key}`)
      continue
    }

    console.log('Generating thumbnail:', {
      source: key,
      thumbnailKey,
    })

    const getResult = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket || MEDIA_BUCKET,
        Key: key,
      })
    )

    if (!getResult.Body) {
      console.log(`No body found for ${key}`)
      continue
    }

    const inputBuffer = await streamToBuffer(getResult.Body as Readable)
    const outputBuffer = await sharp(inputBuffer)
      .resize({
        width: MAX_THUMBNAIL_SIZE,
        height: MAX_THUMBNAIL_SIZE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket || MEDIA_BUCKET,
        Key: thumbnailKey,
        Body: outputBuffer,
        ContentType: 'image/jpeg',
      })
    )

    await dynamoDb.send(
      new UpdateCommand({
        TableName: MEDIA_TABLE,
        Key: {
          pk: 'MEDIA',
          sk: mediaId,
        },
        UpdateExpression: 'SET thumbnailKey = :thumbnailKey',
        ExpressionAttributeValues: {
          ':thumbnailKey': thumbnailKey,
        },
      })
    )

    console.log(`Thumbnail saved: ${thumbnailKey}`)
  }
}
