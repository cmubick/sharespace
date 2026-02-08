# API Documentation

## Base URL

```
https://api.sharespace.example.com
```

## Authentication

All requests require Bearer token in Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Response Format

Success (200-299):
```json
{
  "statusCode": 200,
  "body": {
    "data": "..."
  }
}
```

Error (4xx-5xx):
```json
{
  "statusCode": 400,
  "body": {
    "error": "Error message"
  }
}
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "user123",
    "email": "user@example.com"
  }
}
```

#### POST /auth/signup
Create new account.

#### POST /auth/refresh
Refresh authentication token.

### Media

#### GET /media
List user's media files.

Query parameters:
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)

Response:
```json
{
  "items": [
    {
      "id": "media123",
      "name": "vacation.jpg",
      "type": "image",
      "url": "https://...",
      "size": 2048000,
      "uploadedAt": "2024-02-08T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 1
}
```

#### POST /media/upload
Upload new media file.

Form data:
- `file` (binary) - Media file
- `description` (string) - Optional description

Response:
```json
{
  "id": "media123",
  "url": "https://...",
  "uploadedAt": "2024-02-08T12:00:00Z"
}
```

#### GET /media/{id}
Get media file details.

#### DELETE /media/{id}
Delete media file.

### User

#### GET /user/profile
Get current user profile.

Response:
```json
{
  "id": "user123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### PUT /user/profile
Update user profile.

Request:
```json
{
  "displayName": "Jane Doe"
}
```

#### DELETE /user
Delete user account.

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 413 | Payload Too Large | File exceeds size limit |
| 500 | Internal Server Error | Server error |

## Rate Limiting

API rate limits:
- 100 requests per minute per IP
- 1000 requests per hour per user

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1644333600
```

## Pagination

List endpoints support pagination:

Query parameters:
- `page` - Page number (1-indexed)
- `limit` - Items per page (max 100)

Response includes:
```json
{
  "items": [...],
  "page": 1,
  "limit": 20,
  "total": 500,
  "pages": 25
}
```

## Filtering

Some endpoints support filtering:

```
GET /media?type=image&uploadedAfter=2024-01-01
```

Available filters documented per endpoint.

## SDKs

Client SDKs available:
- JavaScript/TypeScript (npm)
- Python (pip)
- Go (go get)

See client library documentation for usage.
