# Infrastructure

AWS CDK TypeScript code for ShareSpace infrastructure.

## Overview

This directory contains Infrastructure as Code (IaC) using AWS CDK to define and deploy all cloud resources:
- API Gateway (REST API)
- Lambda functions
- S3 buckets for media storage
- CloudFront distribution
- DynamoDB tables (as needed)
- IAM roles and policies
- VPC and networking (if needed)
- CloudWatch monitoring and logs

## Project Structure

```
infrastructure/
├── lib/
│   ├── stacks/
│   │   ├── api-stack.ts         # API Gateway and Lambda setup
│   │   ├── storage-stack.ts     # S3 buckets configuration
│   │   ├── database-stack.ts    # DynamoDB and database resources
│   │   └── cdn-stack.ts         # CloudFront distribution
│   └── sharespace-stack.ts      # Main stack composition
├── bin/
│   └── sharespace.ts            # CDK app entry point
├── cdk.json                      # CDK context and configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI: `npm install -g aws-cdk`
- Docker (for bundling Lambda functions)

### Install Dependencies

```bash
npm install
```

### Initialize CDK

If this is a new CDK project:

```bash
cdk init app --language typescript
```

## Development

### Synthesize CloudFormation Template

```bash
npm run build
cdk synth
```

### Deploy Infrastructure

```bash
# First time (requires CDK bootstrap)
cdk bootstrap

# Deploy
cdk deploy

# Deploy specific stack
cdk deploy ShareSpaceStack
```

### View Differences

Before deploying, see what changes will be made:

```bash
cdk diff
```

### Destroy Infrastructure

```bash
cdk destroy
```

## Environment Configuration

Create `.env` file for environment-specific values:

```env
AWS_REGION=us-east-1
ENVIRONMENT=development
CDK_DEFAULT_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=123456789012
```

## Lambda Integration

Lambda function code is bundled from the `../backend/` directory during the CDK build process. The build script handles:
1. Compiling backend TypeScript
2. Creating deployment packages
3. Uploading to Lambda

## CI/CD Integration

This infrastructure is deployed via GitHub Actions. Configuration is in `.github/workflows/deploy.yml`.

Push to main branch triggers:
1. Infrastructure validation
2. Automatic deployment to AWS

## Stacks

The infrastructure is organized into logical stacks:

- **API Stack** - REST API, Lambda authorizers, request routing
- **Storage Stack** - S3 buckets for media, lifecycle policies
- **Database Stack** - DynamoDB tables, indexes
- **CDN Stack** - CloudFront distribution for frontend and media delivery

## Outputs

After deployment, CDK outputs important values:
```
Outputs:
  ApiEndpoint = https://api.sharespace.example.com
  BucketName = sharespace-media-bucket-prod
  CloudFrontUrl = https://cdn.sharespace.example.com
```

These are available in the AWS CloudFormation console and can be referenced by other services.

## Best Practices

- Keep stacks modular and single-responsibility
- Use parameters for environment-specific values
- Tag all resources for cost tracking
- Set up monitoring and alarms early
- Document custom constructs
- Use conditional logic for dev/prod differences
- Keep sensitive data in AWS Secrets Manager

## Troubleshooting

### Common Issues

**CDK not finding backend code**
- Ensure backend is built before running `cdk deploy`
- Check paths in the stack definitions

**Permission denied on S3 bucket**
- Verify IAM roles have correct policies
- Check bucket policies

**Lambda timeout**
- Increase timeout in stack configuration
- Check Lambda logs in CloudWatch

## Testing

(To be configured)

## Contributing

See [../docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md)
