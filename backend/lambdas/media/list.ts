import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { createErrorResponse, createSuccessResponse, createOptionsResponse } from '../../shared/utils'

const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-west-2',
  })
)

const MEDIA_TABLE = process.env.MEDIA_TABLE || 'sharespace-media-table'

/**
 * List user's media files
 * Queries DynamoDB for user's media items
 * Implementation placeholder
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return createOptionsResponse()
    }

    console.log('List media request received:', {
      requestId: context.awsRequestId,
      path: event.path,
      method: event.httpMethod,
      queryParams: event.queryStringParameters,
    })

    const page = parseInt(event.queryStringParameters?.page || '1')
    const limit = parseInt(event.queryStringParameters?.limit || '50')

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid pagination parameters',
          details: 'page >= 1, 1 <= limit <= 100',
        }),
      }
    }

    console.log('Fetching media list:', {
      page,
      limit,
    })

    const queryResult = await dynamoDb.send(
      new QueryCommand({
        TableName: MEDIA_TABLE,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': 'MEDIA',
        },
        Limit: limit,
        ScanIndexForward: false,
      })
    )

    const items = (queryResult.Items || []).map((item: any) => ({
      id: item.mediaId,
      filename: item.filename,
      uploader: item.uploaderName,
      uploadTimestamp: item.uploadTimestamp,
      mediaType: item.mediaType,
      s3Key: item.s3Key,
      caption: item.caption,
      year: item.year,
    }))

    return createSuccessResponse({
      items,
      pagination: {
        page,
        limit,
        total: items.length,
        totalPages: 1,
      },
    })
  } catch (error) {
    console.error('List media error:', error)

    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to list media'),
      500
    )
  }
}
