# Backend

Node.js Lambda functions and shared utilities for ShareSpace.

## Overview

The backend consists of:
- **lambdas/** - Individual AWS Lambda function handlers
- **shared/** - Common utilities, types, and helper functions shared across lambdas

## Directory Structure

```
backend/
├── lambdas/
│   ├── auth/            # Authentication and authorization functions
│   ├── media/           # Media upload and processing functions
│   ├── user/            # User profile and settings functions
│   └── ...              # Other domain-specific lambdas
├── shared/
│   ├── types/           # Shared TypeScript interfaces
│   ├── utils/           # Helper functions and utilities
│   ├── constants/       # Application constants
│   ├── aws/             # AWS SDK wrappers and clients
│   └── middleware/      # Shared middleware and decorators
├── package.json         # Dependencies for all backend services
├── tsconfig.json        # TypeScript configuration
└── .env.example         # Example environment variables
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

#### Build

```bash
npm run build
```

#### Watch Mode (for development)

```bash
npm run watch
```

#### Type Checking

```bash
npm run type-check
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
AWS_REGION=us-east-1
ENVIRONMENT=development
DEBUG=true
```

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

## Shared Utilities

Place reusable code in `shared/`:
- **types/** - TypeScript interfaces used across lambdas
- **utils/** - Helper functions
- **aws/** - AWS SDK client configurations
- **middleware/** - Common middleware for request handling

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
