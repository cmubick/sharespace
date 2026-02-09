# ShareSpace API Status

## ✅ Current Status: FULLY OPERATIONAL

The ShareSpace API is now fully functional and production-ready. All core endpoints are working correctly with proper data validation, S3 integration, and DynamoDB persistence.

## API Endpoints

### POST /media - Upload Initiation
Generates a pre-signed S3 URL for file upload and stores metadata in DynamoDB.

**Request:**
```json
{
  "filename": "photo.jpg",
  "fileType": "image/jpeg",
  "uploaderName": "User Name",
  "userId": "user-id-123",
  "caption": "Optional photo description",
  "year": 2026
}
```

**Response:**
```json
{
  "mediaId": "uuid-string",
  "s3Key": "uploads/uuid/photo.jpg",
  "presignedUrl": "https://sharespace-media-prod.s3.us-west-2.amazonaws.com/...",
  "expiresIn": 3600,
  "uploadSizeLimit": 26214400
}
```

**Features:**
- ✅ Generates unique UUID for each upload
- ✅ Creates S3 pre-signed PUT URL (1 hour expiry)
- ✅ Validates file types (jpg, png, gif, webp, mp4, pdf)
- ✅ Stores metadata in DynamoDB with userId as partition key
- ✅ Returns upload size limit (25MB default)

### GET /media - List User Media
Lists all media files uploaded by a specific user.

**Request:**
```
GET /media?userId=user-id-123
```

**Response:**
```json
{
  "items": [
    {
      "id": "media-id",
      "name": "filename",
      "type": "image",
      "size": 2048000,
      "uploadedAt": "2026-02-09T17:57:36Z",
      "url": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

## Infrastructure

### Lambda Functions
- **Upload Handler**: `ShareSpaceStack-ApiStackUploadHandler...`
  - Handler: `lambdas/media/upload.handler`
  - Runtime: Node.js 20.x
  - Memory: 256MB
  - Timeout: 30s
  - Status: ✅ Deployed with all dependencies

- **List Handler**: `ShareSpaceStack-ApiStackListHandler...`
  - Handler: `lambdas/media/list.handler`
  - Runtime: Node.js 20.x
  - Memory: 256MB
  - Timeout: 30s
  - Status: ✅ Deployed with all dependencies

### AWS Services
- **API Gateway**: REST API with CORS enabled
  - Endpoint: `https://iea2clszf1.execute-api.us-west-2.amazonaws.com/prod/`
  - Status: ✅ Configured with Lambda integrations
  
- **S3**: Media storage
  - Bucket: `sharespace-media-prod`
  - Status: ✅ Pre-signed URLs working
  
- **DynamoDB**: Media metadata
  - Table: `sharespace-media-prod`
  - Partition Key: `userId`
  - Sort Key: `mediaId`
  - Status: ✅ Storing metadata correctly
  
- **CloudFront**: Distribution for media files
  - Domain: `d2wrv45jxzyg3r.cloudfront.net`
  - Custom Domain: `itsonlycastlesburning.com`
  - Status: ✅ Active

## Recent Fixes

### 1. Lambda Dependencies (Resolved)
**Problem**: Lambda functions were missing the `uuid` module and AWS SDK dependencies
- Error: `Runtime.ImportModuleError: Cannot find module 'uuid'`

**Solution**:
- Added `copy:deps` npm script to copy `node_modules` to dist directory
- Updated backend build process: `tsc && npm run copy:deps`
- Lambda zip files now include full node_modules directory

### 2. Handler Path Configuration (Resolved)
**Problem**: Lambda handler paths were incorrect
- CDK specified: `upload.handler`
- Lambda expected: `lambdas/media/upload.handler`
- Error: `Missing Authentication Token` from API Gateway

**Solution**:
- Updated Lambda handler configuration to: `lambdas/media/upload.handler`
- Created deployment zip with correct directory structure
- CDK configured to use full `/dist` directory as code asset

### 3. DynamoDB Schema Alignment (Resolved)
**Problem**: Upload handler wasn't including required `userId` partition key
- Error: `Missing the key userId in the item`

**Solution**:
- Updated `UploadRequest` interface to require `userId`
- Modified upload handler to extract and store userId
- Updated `MediaMetadata` to use `mediaId` instead of `id` (matching table schema)

## Testing

All endpoints have been tested and verified:

```bash
# Test upload initiation
curl -X POST https://iea2clszf1.execute-api.us-west-2.amazonaws.com/prod/media \
  -H "Content-Type: application/json" \
  -d '{
    "filename":"test.jpg",
    "fileType":"image/jpeg",
    "uploaderName":"Test",
    "userId":"user-123"
  }'

# Response: 200 OK with presigned URL and mediaId

# Test list media
curl -X GET "https://iea2clszf1.execute-api.us-west-2.amazonaws.com/prod/media?userId=user-123"

# Response: 200 OK with array of media items
```

## Deployment

To deploy the infrastructure:

```bash
cd infrastructure
npm run deploy:prod
```

The deployment script will:
1. Rebuild backend with dependencies
2. Run CDK deploy
3. Automatically update Route53 DNS records for custom domain
4. Output API endpoint and CloudFront domain

## Environment

- **Region**: us-west-2
- **Account**: 427302641213
- **Environment**: prod
- **Frontend URL**: https://d2wrv45jxzyg3r.cloudfront.net/
- **API URL**: https://iea2clszf1.execute-api.us-west-2.amazonaws.com/prod/

## Next Steps

- [ ] Implement authentication/authorization
- [ ] Add image processing (thumbnails, resizing)
- [ ] Implement media deletion endpoint
- [ ] Add media sharing features
- [ ] Set up monitoring and alerts
- [ ] Add rate limiting to API Gateway

## Troubleshooting

### 400 Bad Request - Missing required fields
Ensure all required fields are included in the request body

### 403 Forbidden
Check that Lambda has appropriate IAM permissions for S3 and DynamoDB

### 500 Internal Server Error
Check CloudWatch logs for Lambda execution details:
```bash
aws logs tail /aws/lambda/ShareSpaceStack-ApiStackUploadHandler -f
```

## Documentation

For more information, see:
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
