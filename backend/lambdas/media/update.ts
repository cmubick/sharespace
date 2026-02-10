import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { createErrorResponse, createSuccessResponse, createOptionsResponse, validateRequiredFields } from '../../shared/utils'

const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-west-2',
  })
)

const MEDIA_TABLE = process.env.MEDIA_TABLE || 'sharespace-media-table'

interface UpdateRequest {
  caption?: string
  year?: number
  album?: string
  uploaderName?: string
}

const buildYearSort = (yearValue?: number) => {
  const safeYear = typeof yearValue === 'number' ? yearValue : 9999
  return String(safeYear).padStart(4, '0')
}

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

    if (!event.body) {
      return createErrorResponse(new Error('Request body is required'), 400)
    }

    let updateRequest: UpdateRequest
    try {
      updateRequest = JSON.parse(event.body)
    } catch (err) {
      console.error('Failed to parse request body:', err)
      return createErrorResponse(new Error('Invalid JSON in request body'), 400)
    }

    const hasUpdates = validateRequiredFields(updateRequest, ['caption', 'year', 'album', 'uploaderName']).length < 4
    if (!hasUpdates) {
      return createErrorResponse(new Error('No valid fields provided'), 400)
    }

    const { caption, year, album, uploaderName } = updateRequest

    if (year !== undefined && (typeof year !== 'number' || year < 1900 || year > 2100)) {
      return createErrorResponse(new Error('Year must be between 1900 and 2100'), 400)
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

    const updateExpressions: string[] = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, any> = {}

    if (caption !== undefined) {
      updateExpressions.push('#caption = :caption')
      expressionAttributeNames['#caption'] = 'caption'
      expressionAttributeValues[':caption'] = caption
    }

    if (album !== undefined) {
      updateExpressions.push('#album = :album')
      expressionAttributeNames['#album'] = 'album'
      expressionAttributeValues[':album'] = album
    }

    if (uploaderName !== undefined) {
      updateExpressions.push('#uploaderName = :uploaderName')
      expressionAttributeNames['#uploaderName'] = 'uploaderName'
      expressionAttributeValues[':uploaderName'] = uploaderName
    }

    if (year !== undefined) {
      updateExpressions.push('#year = :year')
      expressionAttributeNames['#year'] = 'year'
      expressionAttributeValues[':year'] = year

      if (existing.Item.year && !existing.Item.originalYear) {
        updateExpressions.push('#originalYear = :originalYear')
        expressionAttributeNames['#originalYear'] = 'originalYear'
        expressionAttributeValues[':originalYear'] = existing.Item.year
      }

      const uploadTimestamp = existing.Item.uploadTimestamp
      if (uploadTimestamp) {
        updateExpressions.push('#gsi3pk = :gsi3pk')
        updateExpressions.push('#gsi3sk = :gsi3sk')
        expressionAttributeNames['#gsi3pk'] = 'gsi3pk'
        expressionAttributeNames['#gsi3sk'] = 'gsi3sk'
        expressionAttributeValues[':gsi3pk'] = 'MEDIA'
        expressionAttributeValues[':gsi3sk'] = `${buildYearSort(year)}#${uploadTimestamp}#${mediaId}`
      }
    }

    const updatedAt = new Date().toISOString()
    updateExpressions.push('#updatedAt = :updatedAt')
    expressionAttributeNames['#updatedAt'] = 'updatedAt'
    expressionAttributeValues[':updatedAt'] = updatedAt

    const updateResult = await dynamoDb.send(
      new UpdateCommand({
        TableName: MEDIA_TABLE,
        Key: {
          pk: 'MEDIA',
          sk: mediaId,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    )

    return createSuccessResponse(updateResult.Attributes)
  } catch (error) {
    console.error('Update media error:', error, {
      requestId: context.awsRequestId,
    })

    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to update media'),
      500
    )
  }
}
