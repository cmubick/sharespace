# Infrastructure Deployment Guide

## Overview

The ShareSpace infrastructure is defined using AWS CDK and consists of:

- **Storage**: S3 buckets for frontend and media uploads
- **CDN**: CloudFront distributions for frontend and media delivery
- **Database**: DynamoDB tables for media metadata and users
- **API**: API Gateway with Lambda integration placeholders
- **IAM**: Lambda execution role with S3 and DynamoDB permissions

## Architecture Components

### Storage Stack
- **Frontend Bucket**: Private S3 bucket for built React application
- **Media Bucket**: Private S3 bucket for user-uploaded media files
  - Versioning enabled
  - CORS configured for cross-origin requests
  - Lifecycle policies for incomplete uploads and old versions

### Database Stack
- **Media Table**: Stores media metadata
  - Partition Key: `userId`
  - Sort Key: `mediaId`
  - Global Secondary Indexes:
    - `mediaTypeIndex`: Query by media type
    - `uploadDateIndex`: Query by upload date
  
- **Users Table**: Stores user information
  - Partition Key: `userId`
  - Global Secondary Index:
    - `emailIndex`: Query users by email

### CDN Stack
- **Frontend Distribution**: CloudFront distribution for the React app
  - Serves from `sharespace-frontend-{env}` S3 bucket
  - SPA error handling (403 → index.html)
  - Request compression enabled
  
- **Media Distribution**: CloudFront distribution for media delivery
  - Serves from `sharespace-media-{env}` S3 bucket
  - CORS support enabled
  - Optimized caching for media files

### API Stack
- **REST API**: API Gateway with placeholder integrations
  - Endpoints for `/auth`, `/media`, `/user`
  - CORS enabled
  - CloudWatch logging enabled
  - X-Ray tracing enabled (prod only)
  
- **Lambda Execution Role**: IAM role for Lambda functions
  - Basic Lambda execution permissions
  - X-Ray write access
  - Automatically granted access to S3 buckets and DynamoDB tables

## Environment-Based Naming

All resources are named with environment suffix for dev/prod separation:

```
Environment | Frontend Bucket            | Media Bucket             | API Name
------------|---------------------------|-------------------------|---------------------
dev         | sharespace-frontend-dev   | sharespace-media-dev     | sharespace-api-dev
prod        | sharespace-frontend-prod  | sharespace-media-prod    | sharespace-api-prod
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured: `aws configure`
3. **Node.js 18+** and npm
4. **AWS CDK CLI**: `npm install -g aws-cdk`

## Installation

```bash
cd infrastructure
npm install
```

## Deployment

### View What Will Be Deployed

```bash
# For dev environment
npm run diff:dev

# For prod environment
npm run diff:prod
```

### Bootstrap CDK (First Time Only)

Required only once per AWS account/region:

```bash
cdk bootstrap
```

### Deploy

```bash
# Deploy to dev
npm run deploy:dev

# Deploy to prod
npm run deploy:prod

# Deploy with custom environment
ENVIRONMENT=staging cdk deploy
```

### Destroy

```bash
# Destroy dev
cdk destroy --force

# Destroy prod (with ENVIRONMENT variable)
ENVIRONMENT=prod cdk destroy --force
```

## Configuration

### Environment Variables

Set before running CDK commands:

```bash
# Environment selection
export ENVIRONMENT=dev          # or 'prod'

# AWS configuration
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012

# CDK configuration
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1
```

### CDK Context

Override settings via CLI:

```bash
cdk deploy -c environment=prod
```

## Stack Outputs

After deployment, CDK outputs important values:

```
Outputs:
  ShareSpaceStack.FrontendBucketName = sharespace-frontend-dev
  ShareSpaceStack.FrontendBucketArn = arn:aws:s3:::sharespace-frontend-dev
  ShareSpaceStack.MediaBucketName = sharespace-media-dev
  ShareSpaceStack.MediaBucketArn = arn:aws:s3:::sharespace-media-dev
  ShareSpaceStack.MediaTableName = sharespace-media-dev
  ShareSpaceStack.MediaTableArn = arn:aws:dynamodb:us-east-1:123456789012:table/sharespace-media-dev
  ShareSpaceStack.UsersTableName = sharespace-users-dev
  ShareSpaceStack.UsersTableArn = arn:aws:dynamodb:us-east-1:123456789012:table/sharespace-users-dev
  ShareSpaceStack.ApiEndpoint = https://abcd1234.execute-api.us-east-1.amazonaws.com/dev
  ShareSpaceStack.ApiId = abcd1234
  ShareSpaceStack.LambdaExecutionRoleArn = arn:aws:iam::123456789012:role/sharespace-lambda-execution-dev
  ShareSpaceStack.FrontendDistributionUrl = https://d123456789abc.cloudfront.net
  ShareSpaceStack.MediaDistributionUrl = https://d987654321xyz.cloudfront.net
```

Export these for use in other systems or save to a `.env` file.

## Accessing Resources

### S3 Buckets

```bash
# List frontend bucket
aws s3 ls s3://sharespace-frontend-dev/

# Upload a file to media bucket
aws s3 cp my-media.jpg s3://sharespace-media-dev/

# Deploy built frontend
aws s3 sync ../frontend/dist/ s3://sharespace-frontend-dev/
```

### DynamoDB Tables

```bash
# List tables
aws dynamodb list-tables --region us-east-1

# Scan media table
aws dynamodb scan --table-name sharespace-media-dev

# Query user's media
aws dynamodb query \
  --table-name sharespace-media-dev \
  --key-condition-expression "userId = :userId" \
  --expression-attribute-values '{":userId": {"S": "user123"}}'
```

### CloudFront

```bash
# List distributions
aws cloudfront list-distributions

# Invalidate frontend cache
aws cloudfront create-invalidation \
  --distribution-id D123456789ABC \
  --paths "/*"
```

### API Gateway

```bash
# Test API endpoint
curl https://abcd1234.execute-api.us-east-1.amazonaws.com/dev/auth/login

# Get API details
aws apigateway get-rest-api --rest-api-id abcd1234
```

## Development Workflow

### Local Testing

1. Synthesize CloudFormation template:
   ```bash
   npm run synth
   ```

2. Review generated template:
   ```bash
   cat cdk.out/ShareSpaceStack.template.json
   ```

3. Check diff before deploying:
   ```bash
   npm run diff:dev
   ```

### Type Checking

```bash
npm run type-check
```

### Building

```bash
npm run build
```

## Updating Resources

### Add New Resource

1. Update the appropriate stack file (e.g., `lib/stacks/api-stack.ts`)
2. Check what will change:
   ```bash
   npm run diff:dev
   ```
3. Deploy:
   ```bash
   npm run deploy:dev
   ```

### Modify Existing Resource

1. Edit the resource in the stack
2. Review changes:
   ```bash
   npm run diff:dev
   ```
3. Deploy:
   ```bash
   npm run deploy:dev
   ```

## Troubleshooting

### Common Issues

**CDK Bootstrap Not Done**
```
Error: This stack uses assets, so the toolkit stack must be deployed
```
Solution: Run `cdk bootstrap`

**Insufficient Permissions**
```
Error: User is not authorized to perform: cdk:DeployStack
```
Solution: Check IAM permissions, ensure user has CloudFormation, Lambda, S3, DynamoDB, API Gateway permissions

**Stack Already Exists**
```
Error: Stack with id ShareSpaceStack already exists
```
Solution: Use `cdk destroy` first or deploy to different account/region

**S3 Bucket Name Conflict**
```
Error: Bucket name already exists
```
Solution: S3 bucket names are globally unique. Update `lib/config.ts` with unique suffix.

### Debugging

Enable debug output:

```bash
CDK_DEBUG=true npm run deploy:dev
```

View CloudFormation events:

```bash
aws cloudformation describe-stack-events \
  --stack-name ShareSpaceStack \
  --region us-east-1
```

Check CloudFormation template:

```bash
aws cloudformation get-template \
  --stack-name ShareSpaceStack \
  --region us-east-1
```

## Security Considerations

### Current Setup

- ✅ S3 buckets are private (public access blocked)
- ✅ Encryption enabled on all buckets
- ✅ DynamoDB encryption enabled
- ✅ API Gateway CORS configured
- ✅ CloudFront enforces HTTPS
- ✅ Lambda has minimal required permissions

### Additional Hardening (Optional)

1. **Enable MFA Delete** on S3 buckets
2. **Add VPC Endpoints** for private API access
3. **Enable WAF** on CloudFront distribution
4. **Set up Secrets Manager** for sensitive data
5. **Enable CloudTrail** for audit logging
6. **Configure bucket versioning** (already enabled for media)

## Cost Optimization

### Current Configuration

- **S3**: Pay per GB stored + requests
- **CloudFront**: Data transfer + requests
- **DynamoDB**: On-demand billing (pay per request)
- **API Gateway**: Per million requests + data transfer
- **Lambda**: Included in API Gateway tier

### Ways to Reduce Costs

1. **Enable CloudFront caching** (already configured)
2. **Use S3 Intelligent-Tiering** for old media
3. **Set DynamoDB TTL** on temporary data
4. **Archive old logs** in S3 Glacier
5. **Monitor usage** with AWS Cost Explorer

## Next Steps

1. Deploy infrastructure: `npm run deploy:dev`
2. Build and deploy frontend to S3: See [../frontend/README.md](../../frontend/README.md)
3. Implement Lambda functions: See [../backend/README.md](../../backend/README.md)
4. Integrate Lambda with API Gateway
5. Configure custom domain (optional)
6. Set up CI/CD pipeline: See [../docs/CI_CD.md](../../docs/CI_CD.md)
