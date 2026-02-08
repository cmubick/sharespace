# ShareSpace Infrastructure - Documentation Index

## Quick Navigation

### 🚀 Getting Started
1. **[COMPLETION_SUMMARY.txt](COMPLETION_SUMMARY.txt)** - Overview of what was created (start here!)
2. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - How to deploy to AWS
3. **[COMMANDS.md](COMMANDS.md)** - All available npm commands

### 📚 Understanding the Infrastructure
1. **[INFRASTRUCTURE_SUMMARY.md](INFRASTRUCTURE_SUMMARY.md)** - Architecture and components
2. **[README.md](README.md)** - Infrastructure overview
3. Source code:
   - [lib/config.ts](lib/config.ts) - Configuration management
   - [lib/sharespace-stack.ts](lib/sharespace-stack.ts) - Main stack composition
   - [lib/stacks/](lib/stacks/) - Individual stack implementations

### 🔧 Development
- **Build**: `npm run build`
- **Type Check**: `npm run type-check`
- **Watch**: `npm run watch`

### 📤 Deployment
- **Preview (dev)**: `npm run diff:dev`
- **Preview (prod)**: `npm run diff:prod`
- **Deploy (dev)**: `npm run deploy:dev`
- **Deploy (prod)**: `npm run deploy:prod`

## Architecture Overview

```
User
  ↓
CloudFront Distribution (Frontend)
  ↓
S3 Bucket (Frontend)
  ↓
React Application

                    +
                    ↓
              CloudFront Distribution (Media)
                    ↓
              S3 Bucket (Media)

                    +
                    ↓
              API Gateway (sharespace-api-{env})
                    ↓
              Lambda Functions (placeholder)
              (auth, media, user)
                    ↓
              ┌─────┴─────┐
              ↓           ↓
           S3         DynamoDB
         Media      (media, users)
         Bucket       Tables
```

## Key AWS Resources

### Storage
- **S3 Bucket**: `sharespace-frontend-{env}` - Frontend app hosting
- **S3 Bucket**: `sharespace-media-{env}` - User media storage

### CDN
- **CloudFront Distribution**: Frontend delivery
- **CloudFront Distribution**: Media delivery

### Database
- **DynamoDB Table**: `sharespace-media-{env}` - Media metadata
- **DynamoDB Table**: `sharespace-users-{env}` - User information

### API
- **API Gateway**: `sharespace-api-{env}` - REST API endpoints
- **CloudWatch Logs**: Request logging
- **X-Ray**: Request tracing

### Security
- **IAM Role**: `sharespace-lambda-execution-{env}` - Lambda permissions

## Environment-Based Resources

All resources are created with environment suffix for dev/prod separation:

| Component | Dev | Prod |
|-----------|-----|------|
| Frontend Bucket | sharespace-frontend-dev | sharespace-frontend-prod |
| Media Bucket | sharespace-media-dev | sharespace-media-prod |
| Media Table | sharespace-media-dev | sharespace-media-dev |
| Users Table | sharespace-users-dev | sharespace-users-prod |
| API | sharespace-api-dev | sharespace-api-prod |
| Lambda Role | sharespace-lambda-execution-dev | sharespace-lambda-execution-prod |

## File Structure

```
infrastructure/
├── README.md                      # General overview
├── DEPLOYMENT_GUIDE.md            # How to deploy
├── INFRASTRUCTURE_SUMMARY.md      # What was created
├── COMMANDS.md                    # Command reference
├── COMPLETION_SUMMARY.txt         # This summary
├── lib/
│   ├── config.ts                  # Configuration (naming, env)
│   ├── sharespace-stack.ts        # Main stack composition
│   └── stacks/
│       ├── api-stack.ts           # API Gateway + Lambda role
│       ├── cdn-stack.ts           # CloudFront distributions
│       ├── database-stack.ts      # DynamoDB tables
│       └── storage-stack.ts       # S3 buckets
├── bin/
│   └── sharespace.ts              # CDK app entry point
├── cdk.json                       # CDK context configuration
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── dist/                          # Compiled output (generated)
```

## Security Features

✅ **Encryption**
- S3: AES-256 at rest
- DynamoDB: AWS managed keys

✅ **Network**
- CloudFront enforces HTTPS
- S3 buckets private (block all public)
- Origin Access Identity for secure S3 access

✅ **IAM**
- Lambda role principle of least privilege
- Separate roles per environment
- Automatic permission granting

✅ **Data Protection**
- DynamoDB point-in-time recovery
- S3 versioning enabled
- Lifecycle policies for cleanup

✅ **Monitoring**
- CloudWatch request logging
- X-Ray tracing
- Detailed request/response logs

## Deployment Steps

### Prerequisites
1. AWS account with appropriate permissions
2. AWS CLI configured (`aws configure`)
3. Node.js 18+ and npm
4. AWS CDK CLI (`npm install -g aws-cdk`)

### Deploy Process
1. **Install**: `cd infrastructure && npm install`
2. **Bootstrap**: `cdk bootstrap` (first time only)
3. **Preview**: `npm run diff:dev` (for development)
4. **Deploy**: `npm run deploy:dev` (deploy to development)

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## Integration Points

### With Frontend
- Built React app deploys to `sharespace-frontend-{env}` S3 bucket
- CloudFront serves the application
- Frontend points to API Gateway endpoint

### With Backend
- Lambda functions use `sharespace-lambda-execution-{env}` role
- Automatically have access to S3 and DynamoDB
- API Gateway provides endpoints for integration

### With CI/CD
- GitHub Actions can deploy using npm scripts
- Set `ENVIRONMENT` variable for dev/prod selection
- CDK outputs resource names for use in workflows

## Common Tasks

### View Stack Outputs
After deployment:
```bash
aws cloudformation describe-stacks \
  --stack-name ShareSpaceStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

### List S3 Buckets
```bash
aws s3 ls | grep sharespace
```

### List DynamoDB Tables
```bash
aws dynamodb list-tables --region us-east-1
```

### Destroy Everything
```bash
cdk destroy --force
```

## Troubleshooting

**CDK Bootstrap Not Done?**
```bash
cdk bootstrap
```

**Wrong Environment Selected?**
```bash
ENVIRONMENT=prod npm run deploy:prod
```

**Need to See Changes First?**
```bash
npm run diff:dev  # Preview changes without deploying
```

**TypeScript Errors?**
```bash
npm run type-check  # Check for type errors
npm run build       # Compile TypeScript
```

## Next Steps

1. ✅ **Infrastructure Created** - You are here
2. ⏳ **Deploy to AWS** - See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
3. ⏳ **Build Frontend** - Deploy to S3 bucket
4. ⏳ **Implement Lambda** - Backend functions
5. ⏳ **Test Integration** - End-to-end testing

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Lambda Documentation](https://docs.aws.amazon.com/lambda/)

## Support

For questions about the infrastructure:
1. Check the relevant documentation file above
2. Review the source code in `lib/stacks/`
3. Run `npm run type-check` to verify code integrity
4. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment issues

---

**Status**: ✅ Ready for deployment (not yet deployed)

Last Updated: February 8, 2026
