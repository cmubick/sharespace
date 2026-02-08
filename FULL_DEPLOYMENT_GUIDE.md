# Full Deployment Guide - ShareSpace

Complete step-by-step guide for deploying ShareSpace frontend, backend, and infrastructure.

## Overview

ShareSpace is a monorepo with three workspaces:
- **Frontend**: React/TypeScript/Vite
- **Backend**: Lambda functions/TypeScript
- **Infrastructure**: AWS CDK (TypeScript)

## Prerequisites

1. **AWS Account** with permissions for:
   - Lambda, API Gateway, S3, CloudFront, DynamoDB, CloudWatch
   - IAM role creation
2. **AWS CLI** configured: `aws configure`
3. **AWS CDK** installed globally: `npm install -g aws-cdk@latest`
4. **Node.js** 18+ and npm installed
5. **Git** for version control

## Pre-Deployment Checklist

### 1. Verify Environment Setup

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version

# Check AWS CLI
aws --version

# Check AWS credentials are configured
aws sts get-caller-identity

# Check CDK version
cdk --version
```

### 2. Configure Environment Variables

Create `.env.local` files in each workspace:

**Frontend** (`frontend/.env.local`):
```env
# Authentication
VITE_APP_PASSWORD=shitbird
VITE_PASSWORD_HINT=Vladamir's nickname

# API Configuration (set after infrastructure deployment)
VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod
VITE_CLOUDFRONT_URL=https://your-cloudfront-domain.cloudfront.net
```

**Backend** (`backend/.env.local`):
```env
# AWS Configuration
AWS_REGION=us-west-2
ENVIRONMENT=dev

# S3 Configuration
MEDIA_BUCKET=sharespace-media-bucket-name
MEDIA_TABLE=sharespace-media-table-name
```

**Infrastructure** (`infrastructure/.env.local`):
```env
ENVIRONMENT=dev
AWS_REGION=us-west-2
```

## Deployment Steps

### Step 1: Install Dependencies

```bash
cd /path/to/sharespace

# Install root workspace dependencies
npm install

# Install workspace dependencies
npm install -w frontend
npm install -w backend
npm install -w infrastructure

# Or use the convenience script
npm run install-all
```

### Step 2: Build All Components

```bash
# Build everything
npm run build

# Or individually:
# Build frontend
npm run build -w frontend

# Build backend (Lambda handlers)
npm run build -w backend

# Build infrastructure CDK
npm run build -w infrastructure
```

### Step 3: Type Check (Optional but Recommended)

```bash
npm run type-check
```

### Step 4: Bootstrap CDK (First Time Only)

Only required on first deployment or with new AWS accounts/regions:

```bash
cd infrastructure

# Set your target AWS region
export AWS_REGION=us-west-2

# Bootstrap CDK
cdk bootstrap

# You should see:
# ✓ Environment aws://ACCOUNT_ID/us-west-2 bootstrapped.
```

### Step 5: Preview Infrastructure Changes

Before deploying, review what CDK will create:

```bash
cd infrastructure

# View the diff
cdk diff

# Or for development environment specifically
npm run diff:dev
```

You'll see a detailed CloudFormation changeset showing:
- Resources to be created
- Resources to be modified
- Resources to be deleted

### Step 6: Deploy Infrastructure

Deploy the CDK stack:

```bash
cd infrastructure

# Deploy
cdk deploy

# Or if using predefined scripts:
npm run deploy:dev

# You'll be prompted to confirm:
# Do you wish to deploy these changes (y/n)?
# Type: y
```

**Wait for deployment** - This can take 5-15 minutes. CDK will:
- Create S3 buckets for media storage
- Create DynamoDB table for media metadata
- Set up API Gateway
- Deploy Lambda functions
- Create CloudFront distribution
- Configure IAM roles and permissions

### Step 7: Capture CDK Outputs

When deployment completes, CDK prints outputs. **Save these values**:

```
ShareSpaceStack.APIEndpoint = https://abc123.execute-api.us-west-2.amazonaws.com/prod
ShareSpaceStack.CloudFrontURL = https://d123456.cloudfront.net
ShareSpaceStack.MediaBucketName = sharespace-media-bucket-xyz
ShareSpaceStack.MediaTableName = sharespace-media-table-xyz
```

Update your environment variables with these values.

### Step 8: Deploy Frontend

Build and deploy the frontend:

```bash
cd frontend

# Build optimized production bundle
npm run build

# Output goes to dist/ folder
# Contents:
# - index.html (entry point)
# - assets/index-*.css (styles)
# - assets/index-*.js (JavaScript)
```

**Upload to S3** (if not automated by CDK):
```bash
# Replace with your bucket name
aws s3 sync dist/ s3://sharespace-frontend-bucket/ --delete

# Set cache headers for index.html
aws s3 cp dist/index.html s3://sharespace-frontend-bucket/index.html \
  --cache-control "max-age=0, no-cache, no-store, must-revalidate"

# Set longer cache for assets
aws s3 cp dist/assets/ s3://sharespace-frontend-bucket/assets/ \
  --recursive --cache-control "max-age=31536000, immutable"
```

### Step 9: Invalidate CloudFront Cache (If Needed)

If using CloudFront, invalidate the cache to serve latest version:

```bash
# Find your distribution ID from outputs
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Deployment Verification

After deployment, verify everything is working:

### 1. Test API Gateway

```bash
# Replace with your API endpoint
curl https://your-api-gateway-url.execute-api.us-west-2.amazonaws.com/prod/health

# Should return something like:
# {"status":"ok","timestamp":"2026-02-08T..."}
```

### 2. Test Frontend Access

```bash
# Open in browser
https://your-cloudfront-domain.cloudfront.net

# You should see:
# 1. Login page (password gate)
# 2. After login: Home page
# 3. Navigation: Home, Upload, Gallery, Slideshow
```

### 3. Test Login

- Password: `shitbird` (or your configured password)
- Hint: "Vladamir's nickname" (or your configured hint)

### 4. Test Upload

1. Navigate to "Upload" page
2. Drag/drop a test image (JPEG, PNG, GIF, WebP) or video (MP4)
3. Enter uploader name and optional metadata
4. Click "Upload Media"
5. Verify redirect to gallery with success message

### 5. Test Gallery

1. Navigate to "Gallery"
2. Verify media displays in grid (grouped by year)
3. Click on an item to open viewer modal
4. Verify metadata displays (uploader, caption, year)

### 6. Test Slideshow

1. Navigate to "Slideshow"
2. Verify fullscreen display
3. Test navigation: arrow buttons, keyboard arrows
4. Test autoplay: spacebar to toggle
5. Test sorting: C (chronological), R (random)
6. Test UI auto-hide: move mouse, count to 5 seconds

### 7. Check CloudWatch Logs

```bash
# View Lambda function logs
aws logs tail /aws/lambda/sharespace-media-upload --follow

# View API Gateway logs
aws logs tail /aws/apigateway/sharespace --follow
```

## Rollback & Rollforward

### Rollback to Previous Version

```bash
cd infrastructure

# View deployment history
aws cloudformation describe-stacks --stack-name ShareSpaceStack

# Update to previous commit
git revert <commit-hash>
npm run build
cdk deploy
```

### Update After Changes

```bash
# Make code changes in frontend, backend, or infrastructure

# Rebuild
npm run build

# For infrastructure changes only:
cd infrastructure
cdk diff
cdk deploy

# For frontend changes only:
cd frontend
npm run build
aws s3 sync dist/ s3://your-bucket/ --delete
aws cloudfront create-invalidation --distribution-id ID --paths "/*"

# For Lambda changes only:
cd backend
npm run build
cd infrastructure
cdk deploy
```

## Troubleshooting

### CDK Bootstrap Failed
```bash
# Check AWS credentials
aws sts get-caller-identity

# Try bootstrap again with explicit region
export AWS_REGION=us-west-2
cdk bootstrap
```

### Lambda Deployment Failed
```bash
# Check Lambda build
npm run build -w backend

# Verify bundled files exist
ls backend/bundles/

# Check IAM permissions in AWS Console
```

### Frontend Not Updating
```bash
# Clear CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"

# Clear browser cache (Ctrl+Shift+Delete)

# Verify S3 upload
aws s3 ls s3://your-bucket/
```

### API Gateway 403/401 Errors
```bash
# Check Lambda execution role has S3 and DynamoDB permissions
# Verify API Gateway CORS settings
# Check CloudWatch logs for detailed errors
aws logs tail /aws/lambda/your-function --follow
```

## Production Deployment

### Pre-Production Checklist

- [ ] All tests passing (`npm run type-check`)
- [ ] Environment variables configured correctly
- [ ] SSL/TLS certificates configured
- [ ] Custom domain (if applicable)
- [ ] Backup of existing data (if applicable)
- [ ] Monitoring and alerts configured
- [ ] CloudWatch dashboards set up
- [ ] DLQ (Dead Letter Queue) configured for Lambda

### Production Deployment Command

```bash
# Set production environment
export ENVIRONMENT=prod
export AWS_REGION=us-west-2

# Build everything
npm run build

# Review changes carefully
cd infrastructure
cdk diff --long

# Deploy with confirmation
cdk deploy

# Verify outputs and update DNS records if needed
```

## Monitoring & Logs

After deployment, monitor your application:

```bash
# API Gateway logs
aws logs tail /aws/apigateway/sharespace --follow

# Lambda logs
aws logs tail /aws/lambda/sharespace-media-upload --follow
aws logs tail /aws/lambda/sharespace-health --follow

# S3 access logs
aws logs tail /aws/s3/sharespace-media --follow

# CloudFront logs
aws logs tail /aws/cloudfront/sharespace --follow
```

## Security Best Practices

1. **Never commit `.env.local` files** - Add to `.gitignore`
2. **Use AWS Secrets Manager** for sensitive data
3. **Enable S3 bucket versioning** for media safety
4. **Enable CloudTrail** for audit logging
5. **Use IAM roles** instead of access keys
6. **Enable encryption** at rest and in transit
7. **Configure VPC endpoints** if needed for private access
8. **Set up WAF** (Web Application Firewall) for CloudFront

## Cost Optimization

- **Use CloudFront** for caching (reduces S3 requests)
- **Enable S3 Intelligent-Tiering** for old media
- **Set Lambda memory** appropriately (affects cost and performance)
- **Use DynamoDB on-demand** for predictable costs
- **Enable CloudWatch alarms** for cost monitoring
- **Review billing** monthly in AWS Console

## Next Steps

After successful deployment:

1. [ ] Share application URL with users
2. [ ] Monitor CloudWatch dashboards
3. [ ] Set up automated backups
4. [ ] Configure email alerts for errors
5. [ ] Plan scaling strategy
6. [ ] Document your configuration
7. [ ] Set up CI/CD pipeline (optional)
8. [ ] Configure custom domain name
9. [ ] Enable WAF rules
10. [ ] Schedule regular security audits

## Support & Resources

- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **AWS Lambda**: https://docs.aws.amazon.com/lambda/
- **AWS API Gateway**: https://docs.aws.amazon.com/apigateway/
- **AWS CloudFront**: https://docs.aws.amazon.com/cloudfront/
- **AWS S3**: https://docs.aws.amazon.com/s3/
- **AWS DynamoDB**: https://docs.aws.amazon.com/dynamodb/

## Quick Reference

```bash
# One-liner deployment (from project root)
npm run build && cd infrastructure && cdk bootstrap && cdk deploy

# View currently deployed version
aws cloudformation describe-stacks --query 'Stacks[0].StackStatus'

# Get API endpoint
aws cloudformation describe-stacks --query 'Stacks[0].Outputs' | jq

# Delete everything (CAREFUL!)
cd infrastructure && cdk destroy
```
