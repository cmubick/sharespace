# Media Upload Lambda Endpoint

## Overview

This Lambda function generates pre-signed S3 upload URLs and stores upload metadata in DynamoDB. It allows clients to upload media files directly to S3 without exposing AWS credentials.

## Endpoint

**HTTP Method:** POST  
**Path:** `/media/upload` (via API Gateway)  
**Content-Type:** `application/json`

## Request Body

```json
{
  "filename": "photo.jpg",
  "fileType": "image/jpeg",
  "uploaderName": "John Doe",
  "caption": "My photo",
  "year": 2024
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `filename` | string | Name of the file to upload (spaces will be sanitized) |
| `fileType` | string | MIME type of the file (see allowed types below) |
| `uploaderName` | string | Name of the person uploading the media |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `caption` | string | Optional caption/description for the media |
| `year` | number | Year associated with the media (1900-2100) |

### Allowed File Types

- `image/jpeg` - JPEG images
- `image/png` - PNG images
- `image/gif` - GIF images
- `image/webp` - WebP images
- `video/mp4` - MP4 videos
- `application/pdf` - PDF documents

## Response

### Success Response (200)

```json
{
  "mediaId": "550e8400-e29b-41d4-a716-446655440000",
  "s3Key": "uploads/550e8400-e29b-41d4-a716-446655440000/photo.jpg",
  "presignedUrl": "https://sharespace-media.s3.us-west-2.amazonaws.com/uploads/550e8400-e29b-41d4-a716-446655440000/photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  "expiresIn": 3600,
  "uploadSizeLimit": 26214400
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `mediaId` | string | UUID of the media item |
| `s3Key` | string | S3 object key for the uploaded file |
| `presignedUrl` | string | Pre-signed URL for uploading to S3 (valid for 1 hour) |
| `expiresIn` | number | Seconds until the presigned URL expires |
| `uploadSizeLimit` | number | Maximum upload size in bytes (25MB default) |

### Error Response (400/500)

```json
{
  "error": "Missing required fields: filename, uploaderName"
}
```

## DynamoDB Metadata Storage

Upload metadata is automatically stored in DynamoDB with the following schema:

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Media UUID (primary key) |
| `filename` | string | Original filename |
| `uploader` | string | Name of the uploader |
| `uploadTimestamp` | string | ISO 8601 timestamp of metadata creation |
| `mediaType` | string | MIME type of the file |
| `s3Key` | string | S3 object key |
| `caption` | string | Optional caption (if provided) |
| `year` | number | Optional year (if provided) |

## Usage Example

### 1. Request Pre-signed URL

```bash
curl -X POST http://api.example.com/dev/media/upload \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "vacation_photo.jpg",
    "fileType": "image/jpeg",
    "uploaderName": "Jane Smith",
    "caption": "Summer 2024 vacation",
    "year": 2024
  }'
```

### 2. Upload File to S3

Using the `presignedUrl` from the response:

```bash
curl -X PUT "https://sharespace-media.s3.us-west-2.amazonaws.com/..." \
  -H "Content-Type: image/jpeg" \
  --data-binary @vacation_photo.jpg
```

## Configuration

The handler uses the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-west-2` | AWS region for S3 and DynamoDB |
| `MEDIA_BUCKET` | `sharespace-media` | S3 bucket name for media storage |
| `MEDIA_TABLE` | `sharespace-media-table` | DynamoDB table for metadata |

## Limitations

- Maximum upload size: **25MB** (configurable via `MAX_UPLOAD_SIZE`)
- Pre-signed URL expiration: **1 hour** (configurable via `PRESIGNED_URL_EXPIRY`)
- Filename characters are sanitized (only alphanumeric, dots, dashes, and underscores preserved)

## Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid JSON | Request body is not valid JSON |
| 400 | Missing required fields | One or more required fields are missing |
| 400 | Invalid file type | File type is not in the allowed list |
| 400 | Filename must be non-empty | Filename is empty or not a string |
| 400 | Year out of range | Year is not between 1900-2100 |
| 500 | Failed to generate upload URL | Server error during URL generation or DynamoDB write |

## IAM Permissions Required

The Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::sharespace-media/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/sharespace-media-table"
    }
  ]
}
```

## Dependencies

- `@aws-sdk/client-s3` - S3 client for generating presigned URLs
- `@aws-sdk/s3-request-presigner` - Helper for creating presigned URLs
- `@aws-sdk/client-dynamodb` - DynamoDB client
- `@aws-sdk/lib-dynamodb` - DynamoDB document client
- `uuid` - UUID generation for media IDs

## Future Enhancements

- [ ] Add virus/malware scanning for uploaded files
- [ ] Implement multi-part upload for large files
- [ ] Add file preview generation (thumbnails, transcoding)
- [ ] Track upload progress with WebSocket notifications
- [ ] Add upload quota management per user
