import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
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
      return createErrorResponse(
        new Error('Invalid pagination parameters: page >= 1, 1 <= limit <= 100'),
        400
      )
    }

    const yearParam = event.queryStringParameters?.year
    const uploaderParam = event.queryStringParameters?.uploader

    console.log('Fetching media list:', {
      page,
      limit,
      year: yearParam,
      uploader: uploaderParam,
    })

    let rawItems: any[] = []

    if (yearParam && !Number.isNaN(Number(yearParam)) && !uploaderParam) {
      const year = Number(yearParam)
      const queryResult = await dynamoDb.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: '#year = :year',
          ExpressionAttributeNames: {
            '#year': 'year',
          },
          ExpressionAttributeValues: {
            ':year': year,
          },
          Limit: limit,
          ScanIndexForward: false,
        })
      )
      rawItems = queryResult.Items || []
    } else if (uploaderParam && !yearParam) {
      const queryResult = await dynamoDb.send(
        new QueryCommand({
          TableName: MEDIA_TABLE,
          IndexName: 'GSI2',
          KeyConditionExpression: 'uploaderName = :uploaderName',
          ExpressionAttributeValues: {
            ':uploaderName': uploaderParam,
          },
          Limit: limit,
          ScanIndexForward: false,
        })
      )
      rawItems = queryResult.Items || []
    } else {
      const scanResult = await dynamoDb.send(
        new ScanCommand({
          TableName: MEDIA_TABLE,
          Limit: limit,
        })
      )
      rawItems = scanResult.Items || []

      if (yearParam && !Number.isNaN(Number(yearParam))) {
        const year = Number(yearParam)
        rawItems = rawItems.filter(item => item.year === year)
      }

      if (uploaderParam) {
        rawItems = rawItems.filter(item => item.uploaderName === uploaderParam)
      }

      rawItems.sort((a, b) => {
        const aTime = a.uploadTimestamp ? new Date(a.uploadTimestamp).getTime() : 0
        const bTime = b.uploadTimestamp ? new Date(b.uploadTimestamp).getTime() : 0
        return bTime - aTime
      })
    }

    const items = rawItems.map((item: any) => ({
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
