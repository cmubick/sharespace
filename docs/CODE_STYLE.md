# Code Style Guide

## TypeScript

### General Rules

- Use `const` by default, `let` when needed, never `var`
- Use arrow functions for callbacks and simple functions
- Use explicit return types for functions
- Use interfaces over types for object shapes

### Naming Conventions

```typescript
// Classes: PascalCase
class UserService { }

// Functions: camelCase
function getUserById(id: string) { }

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com'

// Variables: camelCase
const userName = 'John'

// Interfaces: PascalCase, I prefix optional
interface IUser {
  id: string
  name: string
}

// Enums: PascalCase
enum MediaType {
  Image,
  Video,
  Document
}
```

### Files

- One main class/interface per file
- Use index.ts for barrel exports
- Filename matches export: `UserService.ts` exports `UserService`

### Formatting

- 2 spaces for indentation
- 80-100 character line limit (soft)
- No semicolons (configured in prettier)
- Single quotes for strings
- Trailing comma in multiline

## React

### Components

- Functional components only (no class components)
- One component per file
- Filename: PascalCase matching component name
- Props interface: ComponentNameProps

```typescript
// UserProfile.tsx
interface UserProfileProps {
  userId: string
  onUpdate?: (user: User) => void
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  return <div>{userId}</div>
}
```

### Hooks

- Custom hooks in `src/hooks/`
- Name with `use` prefix: `useMediaUpload`
- One hook per file

### Files

```
src/
├── components/        # Reusable components
├── pages/            # Page components
├── hooks/            # Custom hooks
├── services/         # API & external services
├── types/            # TypeScript types
├── App.tsx
└── main.tsx
```

## Backend/Lambda

### Structure

- One Lambda function per file
- Export handler as named export
- Use shared utilities from `shared/`

```typescript
// lambdas/auth/login.ts
import { APIGatewayProxyHandler } from 'aws-lambda'
import { createSuccessResponse } from '../../shared/utils'

export const handler: APIGatewayProxyHandler = async (event) => {
  // Handler logic
  return createSuccessResponse({ token: '...' })
}
```

### Error Handling

```typescript
try {
  // operation
} catch (error) {
  console.error('Failed to process:', error)
  return createErrorResponse(error)
}
```

### Logging

```typescript
console.log('[INFO]', 'Processing request:', requestId)
console.error('[ERROR]', 'Failed operation:', error.message)
```

## Infrastructure/CDK

### Stack Organization

```typescript
export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Define resources here
    const bucket = new s3.Bucket(this, 'MediaBucket', {
      // props
    })

    // Output important values
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    })
  }
}
```

### Naming

- Stacks: PascalCase: `ApiStack`, `StorageStack`
- Constructs: descriptive with resource type: `ApiGateway`, `MediaBucket`
- Outputs: PascalCase: `ApiEndpoint`, `BucketName`

## Comments

### When to Comment

- Complex algorithms
- Non-obvious intent
- Business logic decisions
- Workarounds for bugs

### Avoid Comments For

- Self-explanatory code
- Implementation details that match the name
- Duplicating what code clearly shows

### Style

```typescript
// Single line comment for brief notes

/**
 * Multi-line comment for
 * detailed explanations
 */
```

## Imports

### Organization

```typescript
// 1. External packages
import React from 'react'
import { APIGatewayProxyHandler } from 'aws-lambda'

// 2. Internal modules
import { UserService } from '../services/UserService'
import { IUser } from '../types'

// 3. Relative imports last
import { helper } from './helper'
```

### Ordering

- Alphabetical within each group
- Use barrel imports from index.ts when appropriate

## Testing

- Test files next to source: `Component.test.tsx`
- Descriptive test names: `should validate email format`
- Use consistent test structure

```typescript
describe('UserService', () => {
  it('should fetch user by id', async () => {
    // arrange
    // act
    // assert
  })
})
```

## Environment Variables

- Use `.env` files for local development
- Document in `.env.example`
- Reference in code via `process.env.VARIABLE_NAME`
- Never commit `.env` files

## Git Commits

```
type(scope): subject line

Detailed explanation of changes if needed.
Keep it under 72 characters where possible.

- Use bullet points for multiple changes
- Reference issues: Closes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Documentation

- Update README when adding features
- Document complex functions
- Add JSDoc comments to exported functions
- Keep docs in sync with code

Example JSDoc:
```typescript
/**
 * Fetches a user by ID from the database
 * @param userId - The user's unique identifier
 * @returns Promise resolving to the user object
 * @throws Error if user not found
 */
export async function getUserById(userId: string): Promise<User> {
  // ...
}
```

## Pre-commit Checks

Before committing:
```bash
npm run type-check    # TypeScript validation
npm run lint          # Code style check
npm test              # Unit tests
```
