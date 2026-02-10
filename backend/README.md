# Backend - Lambda Functions & API

Node.js TypeScript Lambda functions and shared utilities for ShareSpace API.

## Quick Start

```bash
# Build all Lambda handlers
npm run build

# View compiled output
ls -la dist/lambdas/
```

## Current Handlers

✅ **Health Check** - `GET /health`

```bash
node -e "const {handler}=require('./dist/lambdas/health/index.js');const event={httpMethod:'GET',path:'/health'};const ctx={awsRequestId:'test',memoryLimitInMB:128};handler(event,ctx).then(r=>console.log(JSON.parse(r.body)))"
```

✅ **Auth Login** - `POST /auth/login`
✅ **List Media** - `GET /media`
✅ **Upload Media** - `POST /media/upload`
✅ **User Profile** - `GET /user/{userId}`

## Directory Structure

```text
backend/
├── lambdas/
│   ├── health/
│   │   └── index.ts              # Health check endpoint
│   ├── auth/
│   │   └── login.ts              # Login handler
│   ├── media/
│   │   ├── list.ts               # List media files
│   │   └── upload.ts             # Initiate media upload
│   └── user/
│       └── profile.ts            # Get user profile
├── shared/
│   ├── types.ts                  # TypeScript interfaces
│   ├── utils.ts                  # Response helpers
│   └── constants.ts              # App constants
├── scripts/
│   ├── bundle-lambda.js          # Bundle single Lambda
│   └── bundle-lambdas.js         # Bundle all Lambdas
├── dist/                         # Compiled JavaScript (generated)
├── bundles/                      # Lambda packages (generated)
└── LAMBDA_BUILD_GUIDE.md         # Detailed build guide
```

## Available NPM Scripts

```bash
npm run build              # Compile all TypeScript to JavaScript
npm run build:lambda:*     # Build specific service (health, auth, media, user)
npm run watch              # Watch mode - rebuild on file changes
npm run type-check         # Check TypeScript types without building
npm run clean              # Remove dist/ and bundles/
npm run build:lambdas      # Create deployment packages
npm run test:lambdas       # Run Lambda unit tests
npm run deploy             # Deploy to AWS Lambda
```

## Deployment

### Via AWS CDK (Recommended)

```bash
cd infrastructure
npm run deploy:dev    # Deploy to development
npm run deploy:prod   # Deploy to production
```

CDK automatically finds compiled handlers in `dist/lambdas/` and deploys them.

### Verify Build

```bash
npm run build
find dist/lambdas -name "*.js" -type f
```

Expected output:

```text
dist/lambdas/health/index.js
dist/lambdas/auth/login.js
dist/lambdas/media/list.js
dist/lambdas/media/upload.js
dist/lambdas/user/profile.js
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
    // 1. Log request
    console.log('Request:', event)

    // 2. Parse body
    const body = event.body ? JSON.parse(event.body) : {}

    // 3. Process
    const result = await processRequest(body)

    // 4. Return 200
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result),
    }
  } catch (error) {
    // Return 500 on error
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error', requestId: context.awsRequestId }),
    }
  }
}
```

## Shared Utilities

### Types (`shared/types.ts`)

- `ShareSpaceUser` - User profile interface
- `MediaItem` - Media metadata interface
- `ApiResponse<T>` - API response wrapper

### Utils (`shared/utils.ts`)

- `createSuccessResponse(data)` - Format success response
- `createErrorResponse(error, requestId)` - Format error response
- `validateRequiredFields(obj, fields)` - Validate request body

### Constants (`shared/constants.ts`)

- `MAX_FILE_SIZE` - 5GB max upload
- `ALLOWED_FILE_TYPES` - image, video, document
- `ENVIRONMENT` - Current environment from `process.env`

## Local Testing

### Option 1: Direct Node.js

```bash
npm run build
node -e "
const { handler } = require('./dist/lambdas/health/index.js');
handler({ path: '/health', httpMethod: 'GET' }, { awsRequestId: 'test', memoryLimitInMB: 128 })
  .then(r => console.log(JSON.parse(r.body)))
"
```

### Option 2: AWS SAM

```bash
# Install SAM (macOS)
brew install aws-sam-cli

# Start local API gateway
sam local start-api --template infrastructure/cdk.out/synthesized-template.json
```

### Option 3: Jest/Vitest

Create test files alongside handlers:

```typescript
// lambdas/health/index.test.ts
import { handler } from './index'

describe('Health Check', () => {
  test('returns 200 status', async () => {
    const result = await handler({ path: '/health', httpMethod: 'GET' } as any, { awsRequestId: 'test', memoryLimitInMB: 128 } as any)
    expect(result.statusCode).toBe(200)
  })
})
```

Then run: `npm run test:lambdas`

### Option 4: Local Express Server

Run the Lambda handlers locally with Express so the frontend can call the API without deployment:

```bash
npm run backend:dev
```

The local API will be available at:

```text
http://localhost:3001
```

Update the frontend to use:

```text
VITE_API_URL=http://localhost:3001
```

Environment variables supported by the local server:

```text
AWS_REGION
MEDIA_TABLE_NAME
MEDIA_BUCKET_NAME
```

## Environment Variables

Lambda handlers access environment variables via `process.env`:

```typescript
const region = process.env.AWS_REGION
const environment = process.env.ENVIRONMENT || 'dev'
const debugMode = process.env.DEBUG === 'true'
```

Set environment variables in CDK:

```typescript
// infrastructure/lib/stacks/api-stack.ts
new lambda.Function(this, 'MyFunction', {
  handler: 'index.handler',
  code: lambda.Code.fromAsset('dist/lambdas/health'),
  environment: {
    ENVIRONMENT: env,
    DEBUG: 'false',
  },
})
```

## CloudWatch Logs

View Lambda logs:

```bash
aws logs tail /aws/lambda/sharespace-health-check-dev --follow
```

Or in AWS Console: CloudWatch > Log Groups

## Adding New Handlers

- Create handler file:

```bash
mkdir -p backend/lambdas/myservice
echo 'export const handler = async (event, context) => ({ statusCode: 200, body: "{}"\n})' > backend/lambdas/myservice/my-handler.ts
```

- Add TypeScript imports and types

- Build:

```bash
npm run build
```

- Deploy via CDK

## Documentation

- **[LAMBDA_BUILD_GUIDE.md](./LAMBDA_BUILD_GUIDE.md)** - Detailed build, test, and deployment guide
- **[Architecture](../docs/ARCHITECTURE.md)** - System design and data flow
- **[API Reference](../docs/API.md)** - REST API endpoints and schemas

## Troubleshooting

**TypeScript compilation errors:**

```bash
npm run type-check
```

**Lambda not executing on AWS:**

1. Check CloudWatch logs
2. Verify handler file exists in `dist/lambdas/{service}/{name}.js`
3. Verify handler exports async function named `handler`
4. Check environment variables are set

**Build fails:**

```bash
npm run clean
npm install
npm run build
```

## Package.json Scripts

All available commands in `backend/package.json`:

| Command | Purpose |
| --- | --- |
| `npm run build` | TypeScript → JavaScript in dist/ |
| `npm run watch` | Rebuild on file changes |
| `npm run type-check` | Check types without building |
| `npm run clean` | Remove dist/ directory |
| `npm run build:lambdas` | Create deployment packages |
| `npm run build:lambda:health` | Build specific service |
| `npm run deploy` | Deploy to AWS Lambda |

## Resources

- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [AWS CDK Lambda](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-lambda-readme.html)
- [API Gateway Lambda Proxy](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)

## Lambda Functions

Each lambda function is in its own subdirectory under `lambdas/`.

### Creating a New Lambda

1. Create a new directory under `lambdas/`
2. Add an `index.ts` file with your handler
3. Import shared utilities from `../shared/`
4. Export your handler

Example structure:

```typescript
// lambdas/example/index.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { createResponse } from '../../shared/utils/response';

export const handler: APIGatewayProxyHandler = async (event, context) => {
  // Handler logic here
  return createResponse(200, { message: 'Success' });
};
```

## Building for Deployment

Lambda functions are packaged and deployed via AWS CDK (see infrastructure/).

```bash
npm run build
```

This compiles TypeScript and prepares bundles for Lambda deployment.

## Testing

(To be configured)

## Best Practices

- Keep lambdas lightweight and focused on a single responsibility
- Use TypeScript for type safety
- Share common code via the `shared/` directory
- Use environment variables for configuration
- Implement proper error handling and logging
- Follow AWS Lambda best practices for cold starts

## Dependencies

Core dependencies:

- `aws-lambda` - Lambda types
- `aws-sdk` - AWS services (or `@aws-sdk/client-*` for modular approach)
- `typescript` - Type safety

See `package.json` for complete list.

## Contributing

See [../docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md)
