# Deployment Guide

## Environments

ShareSpace supports multiple deployment environments:
- **development** - Local development
- **staging** - Testing environment
- **production** - Live environment

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured
3. AWS CDK installed: `npm install -g aws-cdk`
4. Environment variables configured

## Deployment Process

### 1. Bootstrap CDK (First Time Only)

```bash
cd infrastructure
export AWS_REGION=us-east-1
cdk bootstrap
```

### 2. Review Changes

```bash
cdk diff
```

### 3. Deploy Infrastructure

```bash
cdk deploy
```

### 4. Deploy Frontend

Frontend is deployed as part of CDK. After deployment, the CloudFront distribution URL will be in the CDK outputs.

### 5. Deploy Lambda Functions

Lambda functions are automatically packaged during CDK deployment.

## Environment Configuration

Create `.env` files with environment-specific values:

```bash
# infrastructure/.env.production
AWS_REGION=us-east-1
ENVIRONMENT=production
STACK_NAME=sharespace-prod
```

## GitHub Actions Deployment

Automated deployment runs on push to main:

1. Build and test
2. Deploy to AWS
3. Run smoke tests
4. Notify on success/failure

### Required Secrets

Add to GitHub repository settings:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
```

## Rollback

If deployment fails or needs rollback:

```bash
# View deployment history
aws cloudformation describe-stacks --stack-name ShareSpaceStack

# Rollback to previous version
cdk deploy --force
```

## Monitoring Deployment

After deployment, monitor:

1. **CloudFormation**: AWS Console → CloudFormation
2. **Lambda Logs**: CloudWatch Logs
3. **API Gateway**: API Gateway console
4. **Health Checks**: Application monitoring

## Post-Deployment

1. Run smoke tests
2. Verify API endpoints
3. Check frontend loads
4. Test core functionality
5. Monitor error logs

## Troubleshooting

### Deployment Fails

1. Check CloudFormation events
2. Review Lambda execution logs
3. Verify IAM permissions
4. Check resource limits

### Application Issues After Deploy

1. Check Lambda logs in CloudWatch
2. Verify API Gateway configuration
3. Check DynamoDB table status
4. Review S3 bucket policies

## Disaster Recovery

In case of critical failure:

```bash
# Destroy stack (careful!)
cdk destroy

# Redeploy from scratch
cdk bootstrap
cdk deploy
```

## Cost Monitoring

Monitor AWS costs:
1. AWS Billing Dashboard
2. Cost Explorer
3. CloudWatch alarms for unusual activity

See infrastructure/README.md for cost optimization tips.
