# Media Upload Lambda - Integration Details

## API Gateway Integration

The upload Lambda is integrated with API Gateway as a POST endpoint:

**Route:** `POST /media/upload`

### Request Processing

1. **Client Request**
   - Sends JSON with: `filename`, `fileType`, `uploaderName`, optional `caption`, `year`
   - Content-Type: `application/json`

2. **Lambda Validation**
   - Validates all required fields
   - Validates file type against allowed MIME types
   - Validates optional year (1900-2100)
   - Validates filename is non-empty string

3. **S3 Presigned URL Generation**
   - Creates unique media ID (UUID)
   - Generates S3 object key: `uploads/{mediaId}/{filename}`
   - Creates presigned PUT URL (valid for 1 hour)
   - URL includes upload size limit metadata

4. **DynamoDB Metadata Storage**
   - Stores media metadata immediately
   - Fields: id, filename, uploader, uploadTimestamp, mediaType, s3Key, caption (optional), year (optional)
   - Enables metadata lookup before file upload completes

5. **Response**
   - Returns: mediaId, s3Key, presignedUrl, expiresIn, uploadSizeLimit

### Request/Response Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ POST /media/upload
       │ {filename, fileType, uploaderName, ...}
       ▼
┌──────────────────┐
│  API Gateway     │
└──────┬───────────┘
       │
       │
       ▼
┌──────────────────────────────────────────────┐
│         Upload Lambda Handler                │
│  1. Validate request                         │
│  2. Generate unique mediaId                  │
│  3. Create S3 presigned URL                  │
│  4. Store metadata in DynamoDB               │
│  5. Return response                          │
└──────┬─────────────────┬──────────────────────┘
       │                 │
       │                 │ Put Item
       │                 ▼
       │         ┌────────────────┐
       │         │   DynamoDB     │
       │         │  Media Table   │
       │         └────────────────┘
       │
       │ 200 OK
       │ {mediaId, s3Key, presignedUrl, ...}
       ▼
┌─────────────────────────────────────┐
│   Client                            │
│  1. Receives presignedUrl           │
│  2. Uploads file directly to S3     │
│  3. File stored at s3Key            │
└─────────────────────────────────────┘
```

## Environment Configuration

Set these environment variables when deploying:

```bash
AWS_REGION=us-west-2
MEDIA_BUCKET=sharespace-media-dev
MEDIA_TABLE=sharespace-media-dev
```

## CORS Configuration

API Gateway CORS is configured in the CDK stack. Response includes:

```
Access-Control-Allow-Origin: *
```

Allows browser-based uploads from any domain. Restrict in production.

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid JSON | 400 | `{error: "Invalid JSON in request body"}` |
| Missing fields | 400 | `{error: "Missing required fields: ..."}` |
| Invalid file type | 400 | `{error: "Invalid file type. Allowed types: ..."}` |
| Invalid year | 400 | `{error: "Year must be between 1900 and 2100"}` |
| S3/DynamoDB error | 500 | `{error: "Failed to generate upload URL"}` |

## DynamoDB Table Schema

**Table Name:** `sharespace-media-dev` (configurable)

**Primary Key:** `id` (String, UUID)

**Attributes:**
```typescript
{
  id: string,                    // UUID (primary key)
  filename: string,              // Original filename
  uploader: string,              // Name of uploader
  uploadTimestamp: string,       // ISO 8601 timestamp
  mediaType: string,             // MIME type
  s3Key: string,                 // S3 object key
  caption?: string,              // Optional caption
  year?: number                  // Optional year
}
```

**Indexes:** None required (queries by primary key)

**TTL:** None (metadata persists)

## S3 Bucket Configuration

**Bucket Name:** `sharespace-media-dev` (configurable)

**Permissions:**
- Lambda execution role can: `PutObject`, `GetObject`
- Objects stored with metadata containing mediaId and upload limit
- No public access (presigned URLs required)

**Object Structure:**
```
uploads/
├── {mediaId-1}/
│   ├── photo.jpg
│   ├── vacation.mp4
│   └── document.pdf
├── {mediaId-2}/
│   └── another-file.jpg
```

## Presigned URL Details

**Format:** AWS Signature Version 4

**Expiration:** 3600 seconds (1 hour)

**Method:** PUT (client uploads via HTTP PUT)

**Headers to Include:**
```
Content-Type: {MIME type from request}
Authorization: {AWS Signature V4}
X-Amz-Date: {timestamp}
X-Amz-Content-Sha256: {content hash}
```

**Example URL:**
```
https://sharespace-media-dev.s3.us-west-2.amazonaws.com/uploads/550e8400-e29b-41d4-a716-446655440000/photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Date=...&X-Amz-Expires=3600&X-Amz-SignedHeaders=...&X-Amz-Signature=...
```

## Performance Characteristics

- **Request latency:** ~100-200ms (S3 + DynamoDB)
- **Concurrent uploads:** Limited by Lambda concurrency (default 1000)
- **Presigned URL generation:** < 50ms
- **DynamoDB write:** ~10-20ms (on-demand billing)

## Security

✅ **AWS Credentials:** Not exposed to client  
✅ **File Validation:** Type and size checking on request  
✅ **Signed URLs:** Time-limited access (1 hour)  
✅ **S3 Permissions:** Lambda uses IAM role (no public access)  
⚠️  **CORS:** Currently allows all origins (restrict in production)

## Monitoring

Enable CloudWatch logging to monitor:

```
[logs] Upload initiation request received
[logs] Generating pre-signed URL
[logs] Storing metadata in DynamoDB
[logs] Upload URL generated successfully
[errors] Upload initiation error
```

Check CloudWatch Logs group: `/aws/lambda/media-upload`

## Troubleshooting

**Error: "EACCES: permission denied"**  
- Check Lambda execution role has S3 PutObject permission
- Verify MEDIA_BUCKET environment variable is correct

**Error: "DynamoDB: Failed to write item"**  
- Verify DynamoDB table exists
- Check Lambda execution role has dynamodb:PutItem permission
- Verify MEDIA_TABLE environment variable is correct

**Error: "Presigned URL expired"**  
- User must upload within 1 hour of requesting URL
- Request new URL if expired

**Error: "File upload to S3 failed"**  
- Verify file size is under 25MB limit
- Check Content-Type header matches fileType from request
- Ensure presigned URL hasn't expired
