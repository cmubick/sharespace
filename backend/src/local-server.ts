import express from 'express'
import type { ParsedQs } from 'qs'
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { randomUUID } from 'crypto'

const PORT = Number(process.env.PORT || 3001)

const applyEnvDefaults = () => {
  if (!process.env.AWS_REGION) {
    process.env.AWS_REGION = 'us-west-2'
  }

  if (!process.env.MEDIA_TABLE && process.env.MEDIA_TABLE_NAME) {
    process.env.MEDIA_TABLE = process.env.MEDIA_TABLE_NAME
  }

  if (!process.env.MEDIA_BUCKET && process.env.MEDIA_BUCKET_NAME) {
    process.env.MEDIA_BUCKET = process.env.MEDIA_BUCKET_NAME
  }
}

const normalizeHeaders = (headers: Record<string, string | string[] | undefined>) => {
  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value
    } else if (Array.isArray(value)) {
      acc[key] = value.join(',')
    }
    return acc
  }, {})
}

const coerceQueryValue = (value: string | ParsedQs | string[] | ParsedQs[]) => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first = value[0]
    if (typeof first === 'string') return first
    return first ? JSON.stringify(first) : ''
  }
  return JSON.stringify(value)
}

const buildEvent = (req: express.Request): APIGatewayProxyEvent => {
  const queryStringParameters = Object.keys(req.query).length
    ? Object.entries(req.query).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = coerceQueryValue(value as string | ParsedQs | string[] | ParsedQs[])
        return acc
      }, {})
    : null

  const body = req.body && Object.keys(req.body).length > 0
    ? JSON.stringify(req.body)
    : null

  return {
    resource: req.path,
    path: req.path,
    httpMethod: req.method,
    headers: normalizeHeaders(req.headers as Record<string, string | string[] | undefined>),
    multiValueHeaders: {},
    queryStringParameters,
    multiValueQueryStringParameters: null,
    pathParameters: Object.keys(req.params).length ? req.params : null,
    stageVariables: null,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      httpMethod: req.method,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        sourceIp: req.ip,
        user: null,
        userAgent: req.headers['user-agent'] || null,
        userArn: null,
        clientCert: null,
        principalOrgId: null,
      },
      path: req.path,
      protocol: req.protocol.toUpperCase(),
      requestId: randomUUID(),
      requestTimeEpoch: Date.now(),
      resourceId: 'local',
      resourcePath: req.path,
      stage: 'local',
    } as APIGatewayProxyEvent['requestContext'],
    body,
    isBase64Encoded: false,
  }
}

const buildContext = (): Context => ({
  awsRequestId: randomUUID(),
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'sharespace-local',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'local',
  memoryLimitInMB: '128',
  logGroupName: 'local',
  logStreamName: 'local',
  getRemainingTimeInMillis: () => 30000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
})

const handleLambda = (handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      const event = buildEvent(req)
      const context = buildContext()
      const result = await handler(event, context)
      if (result.headers) {
        res.set(result.headers as Record<string, string>)
      }
      res.status(result.statusCode || 200)
      res.send(result.body || '')
    } catch (error) {
      console.error('Local server error:', error)
      res.status(500).json({ error: 'Local server error' })
    }
  }
}

const startServer = async () => {
  applyEnvDefaults()

  const { handler: listHandler } = require('../lambdas/media/list')
  const { handler: uploadHandler } = require('../lambdas/media/upload')
  const { handler: updateHandler } = require('../lambdas/media/update')
  const { handler: deleteHandler } = require('../lambdas/media/delete')

  const app = express()
  app.use(express.json({ limit: '10mb' }))

  app.get('/media', handleLambda(listHandler))
  app.post('/media', handleLambda(uploadHandler))
  app.put('/media/:id', handleLambda(updateHandler))
  app.delete('/media/:id', handleLambda(deleteHandler))
  app.options('/media', handleLambda(listHandler))
  app.options('/media/:id', handleLambda(updateHandler))

  app.listen(PORT, () => {
    console.log(`Local API server running at http://localhost:${PORT}`)
  })
}

startServer()