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

    const limit = parseInt(event.queryStringParameters?.limit || '30')

    // Validate pagination params
    if (limit < 1 || limit > 100) {
      return createErrorResponse(
        new Error('Invalid pagination parameters: 1 <= limit <= 100'),
        400
      )
    }

    const lastKeyParam = event.queryStringParameters?.lastKey
    let exclusiveStartKey: Record<string, any> | undefined
    if (lastKeyParam) {
      try {
        const decoded = Buffer.from(lastKeyParam, 'base64').toString('utf-8')
        exclusiveStartKey = JSON.parse(decoded)
      } catch (err) {
        try {
          exclusiveStartKey = JSON.parse(lastKeyParam)
        } catch (parseErr) {
          return createErrorResponse(new Error('Invalid lastKey parameter'), 400)
        }
      }
    }

    console.log('Pagination request:', {
      limit,
      lastKeyParam,
      exclusiveStartKey,
    })

    const yearParam = event.queryStringParameters?.year
    const uploaderParam = event.queryStringParameters?.uploader

    console.log('Fetching media list:', {
      limit,
      year: yearParam,
      uploader: uploaderParam,
    })

    let rawItems: any[] = []
    let lastEvaluatedKey: Record<string, any> | undefined

    if (yearParam && !Number.isNaN(Number(yearParam)) && !uploaderParam) {
      const year = Number(yearParam)
      const queryParams = {
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
        ScanIndexForward: true,
        ExclusiveStartKey: exclusiveStartKey,
      }

      console.log('DynamoDB query (year):', queryParams)
      const queryResult = await dynamoDb.send(new QueryCommand(queryParams))
      rawItems = queryResult.Items || []
      lastEvaluatedKey = queryResult.LastEvaluatedKey
      console.log('DynamoDB result (year):', {
        count: rawItems.length,
        lastEvaluatedKey,
      })
    } else if (uploaderParam && !yearParam) {
      const queryParams = {
        TableName: MEDIA_TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: 'uploaderName = :uploaderName',
        ExpressionAttributeValues: {
          ':uploaderName': uploaderParam,
        },
        Limit: limit,
        ScanIndexForward: true,
        ExclusiveStartKey: exclusiveStartKey,
      }

      console.log('DynamoDB query (uploader):', queryParams)
      const queryResult = await dynamoDb.send(new QueryCommand(queryParams))
      rawItems = queryResult.Items || []
      lastEvaluatedKey = queryResult.LastEvaluatedKey
      console.log('DynamoDB result (uploader):', {
        count: rawItems.length,
        lastEvaluatedKey,
      })
    } else {
      const queryParams = {
        TableName: MEDIA_TABLE,
        IndexName: 'GSI3',
        KeyConditionExpression: 'gsi3pk = :gsi3pk',
        ExpressionAttributeValues: {
          ':gsi3pk': 'MEDIA',
        },
        Limit: limit,
        ScanIndexForward: true,
        ExclusiveStartKey: exclusiveStartKey,
      }

      console.log('DynamoDB query (chronological):', queryParams)
      const queryResult = await dynamoDb.send(new QueryCommand(queryParams))
      rawItems = queryResult.Items || []
      lastEvaluatedKey = queryResult.LastEvaluatedKey
      console.log('DynamoDB result (chronological):', {
        count: rawItems.length,
        lastEvaluatedKey,
      })
    }

    const items = rawItems
      .filter((item) => !item.hidden)
      .map((item: any) => ({
      id: item.mediaId,
      filename: item.filename,
      uploader: item.uploaderName,
      uploadTimestamp: item.uploadTimestamp,
      mediaType: item.mediaType,
      s3Key: item.s3Key,
      thumbnailKey: item.thumbnailKey,
      caption: item.caption,
      year: item.year,
      }))

    return createSuccessResponse({
      items,
      lastKey: lastEvaluatedKey || null,
    })
  } catch (error) {
    console.error('List media error:', error)

    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to list media'),
      500
    )
  }
}
