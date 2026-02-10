import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { createErrorResponse, createSuccessResponse, createOptionsResponse } from '../../shared/utils'

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

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return createOptionsResponse()
    }

    const mediaId = event.pathParameters?.mediaId || event.pathParameters?.id
    if (!mediaId) {
      return createErrorResponse(new Error('mediaId is required'), 400)
    }

    const existing = await dynamoDb.send(
      new GetCommand({
        TableName: MEDIA_TABLE,
        Key: {
          pk: 'MEDIA',
          sk: mediaId,
        },
      })
    )

    if (!existing.Item) {
      return createErrorResponse(new Error('Media record not found'), 404)
    }

    const s3Key = existing.Item.s3Key
    const thumbnailKey = existing.Item.thumbnailKey

    if (s3Key) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: s3Key,
        })
      )
    }

    if (thumbnailKey) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: thumbnailKey,
        })
      )
    }

    await dynamoDb.send(
      new DeleteCommand({
        TableName: MEDIA_TABLE,
        Key: {
          pk: 'MEDIA',
          sk: mediaId,
        },
      })
    )

    return createSuccessResponse({
      mediaId,
      deleted: true,
    })
  } catch (error) {
    console.error('Delete media error:', error, {
      requestId: context.awsRequestId,
    })

    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to delete media'),
      500
    )
  }
}
