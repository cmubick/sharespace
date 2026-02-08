# Lambda Handlers - Build & Deployment Guide

This guide covers building, testing, and deploying Lambda handlers for the ShareSpace API.

## Overview

Lambda handlers are located in `backend/lambdas/{service}/{handler}.ts` and handle API Gateway requests. Each service (health, auth, media, user) can have multiple handlers.

**Current Handlers:**

- `lambdas/health/index.ts` - Health check endpoint
- `lambdas/auth/login.ts` - User login
- `lambdas/media/list.ts` - List user media files

## Building Lambda Functions

### Build All Handlers

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/lambdas/` directory.

### Build Specific Service

```bash
npm run build:lambda:health
npm run build:lambda:auth
npm run build:lambda:media
npm run build:lambda:user
```

### Watch Mode (Development)

```bash
npm run watch
```

Automatically recompile on file changes—useful during development.

### Type Check Without Building

```bash
npm run type-check
```

Validates TypeScript without generating output files.

## Project Structure

```text
backend/
├── lambdas/
│   ├── health/
│   │   └── index.ts              # Health check handler
│   ├── auth/
│   │   ├── login.ts              # Login handler
│   │   ├── signup.ts             # (Create this next)
│   │   └── refresh.ts            # (Create this next)
│   ├── media/
│   │   ├── list.ts               # List media
│   │   ├── upload.ts             # (Create this next)
│   │   ├── get.ts                # (Create this next)
│   │   └── delete.ts             # (Create this next)
│   └── user/
│       ├── profile.ts            # (Create this next)
│       └── update.ts             # (Create this next)
├── shared/
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── utils.ts                  # Response helpers
│   └── constants.ts              # App constants
├── dist/                         # Compiled JavaScript (generated)
├── bundles/                      # Lambda deployment packages (generated)
├── package.json
└── tsconfig.json
```

## Handler Pattern

All Lambda handlers follow this TypeScript pattern:

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // 1. Log request for debugging
    console.log('Request:', { path: event.path, method: event.httpMethod })

    // 2. Validate input
    const body = event.body ? JSON.parse(event.body) : {}

    // 3. Process request
    const result = await processRequest(body)

    // 4. Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    }
  } catch (error) {
    console.error('Error:', error)

    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        requestId: context.requestId,
      }),
    }
  }
}
```

## API Gateway Integration

Lambda handlers receive `APIGatewayProxyEvent` and return `APIGatewayProxyResult`:

### Event Properties

```typescript
{
  path: '/auth/login',           // Request path
  httpMethod: 'POST',            // HTTP method
  headers: { ... },              // Request headers
  body: '{"email":"..."}',       // Request body (string)
  queryStringParameters: { ... }, // Query params
  pathParameters: { ... },        // Path params
  requestContext: { ... },        // AWS context
}
```

### Response Structure

```typescript
{
  statusCode: 200,               // HTTP status code
  headers: { ... },              // Response headers
  body: JSON.stringify(data),    // Response body (must be string)
}
```

## Running Locally

### Option 1: Using AWS SAM (Recommended)

Install SAM CLI (one-time):

```bash
# macOS
brew tap aws/tap
brew install aws-sam-cli

# Linux
pip install aws-sam-cli
```

Run locally with SAM:

```bash
sam local start-api --template <(npx cdk synth --quiet > /dev/null && cat cdk.out/sharespaceSynthStub.json)
```

Or with environment variables:

```bash
sam local invoke HealthCheckFunction --event events/health.json --template <path-to-template>
```

### Option 2: Using Node.js Directly

Test compiled Lambda function:

```bash
node -e "
const { handler } = require('./dist/lambdas/health/index.js');
const event = { httpMethod: 'GET', path: '/health' };
const context = { requestId: 'test', memoryLimitInMB: 128 };
handler(event, context).then(result => console.log(JSON.stringify(result, null, 2)));
"
```

### Option 3: Using Jest/Vitest

Create test files alongside handlers:

```typescript
// lambdas/health/index.test.ts
import { handler } from './index'

describe('Health Check Handler', () => {
  test('returns 200 status code', async () => {
    const event = { httpMethod: 'GET', path: '/health' }
    const context = { requestId: 'test', memoryLimitInMB: 128 }
    
    const result = await handler(event, context)
    expect(result.statusCode).toBe(200)
    expect(result.body).toContain('status')
  })
})
```

Run tests:

```bash
npm run test:lambdas
```

## Deployment

### Via AWS CDK (Recommended)

The CDK infrastructure (`infrastructure/lib/stacks/api-stack.ts`) automatically deploys Lambda functions:

```bash
cd infrastructure
npm run deploy:dev
```

### Via AWS Lambda Console

1. Build handlers: `npm run build:lambda:health`
2. ZIP the compiled file: `cd dist/lambdas/health && zip -r lambda.zip index.js`
3. Upload ZIP to Lambda console

### Via AWS CLI

```bash
# Build function
npm run build:lambda:health

# Create deployment package
cd dist/lambdas/health
zip -r function.zip index.js node_modules/

# Update function
aws lambda update-function-code \
  --function-name sharespace-health-check-dev \
  --zip-file fileb://function.zip \
  --region us-east-1
```

### Via GitHub Actions

See `.github/workflows/` for CI/CD pipeline that automatically builds and deploys on push.

## Environment Variables

Lambda functions access environment variables via `process.env`:

```typescript
const region = process.env.AWS_REGION
const environment = process.env.ENVIRONMENT || 'dev'
const debugMode = process.env.DEBUG === 'true'
```

Environment variables are set in CDK stack:

```typescript
const lambdaFunction = new lambda.Function(this, 'MyFunction', {
  code: lambda.Code.fromAsset('dist/lambdas/health'),
  handler: 'index.handler',
  environment: {
    ENVIRONMENT: 'dev',
    DEBUG: 'false',
  },
})
```

## CloudWatch Logs

Lambda function logs appear in CloudWatch:

```bash
# View logs in CloudWatch
aws logs tail /aws/lambda/sharespace-health-check-dev --follow

# Or use AWS Console: CloudWatch > Log Groups > /aws/lambda/
```

Logging pattern:

```typescript
console.log('Info:', { key: 'value' })     // INFO level
console.error('Error:', errorMessage)     // ERROR level
console.warn('Warning:', warningMessage)  // WARNING level
```

## Performance & Optimization

### Memory & Timeout

- Health check: 128 MB memory, 30 second timeout (lightweight)
- Auth: 256 MB memory, 30 second timeout
- Media/User: 512 MB memory, 60 second timeout

### Cold Start Optimization

- Keep handler code minimal and focused
- Move initialization outside handler function
- Use Lambda layers for shared dependencies

### Example: Optimized Handler

```typescript
// Initialize once (outside handler)
const dynamodb = new DynamoDBClient({ region: 'us-east-1' })

// Handler called multiple times
export const handler = async (event, context) => {
  // Reuse initialized client (no cold start penalty)
  const result = await dynamodb.send(new GetCommand(...))
  return { statusCode: 200, body: JSON.stringify(result) }
}
```

## Troubleshooting

### Compilation Errors

```bash
npm run type-check
```

### Function Not Found at Deployment

- Verify handler file exists in `backend/lambdas/{service}/{name}.ts`
- Verify handler exports async function named `handler`
- Rebuild: `npm run build`

### Timeout During Execution

- Increase function timeout in CDK stack (default 30s)
- Check CloudWatch logs for slow operations
- Optimize database queries or external API calls

### CORS Errors

- Ensure response headers include `'Access-Control-Allow-Origin': '*'`
- API Gateway CORS must be configured (handled by CDK)
- Frontend should receive proper CORS headers

### Runtime Errors

```bash
# Check logs
aws logs tail /aws/lambda/function-name --follow --format short

# Local testing
npm run build
node dist/lambdas/health/index.js
```

## Next Steps

1. **Create remaining handlers:**
   - Auth signup, refresh
   - Media upload, get, delete
   - User profile, update

2. **Add request/response validation:**
   - JSON schema validation
   - Input sanitization
   - Type-safe request bodies

3. **Integrate with AWS services:**
   - DynamoDB queries for persistence
   - S3 for media uploads
   - Cognito/custom auth for security

4. **Add monitoring:**
   - X-Ray tracing
   - CloudWatch alarms
   - Error tracking (Sentry)

5. **Testing:**
   - Unit tests for handler logic
   - Integration tests with DynamoDB
   - Load testing for performance

## Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS SAM Guide](https://docs.aws.amazon.com/serverless-application-model/)
- [API Gateway Lambda Integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)
- [AWS CDK Lambda](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-lambda-readme.html)
