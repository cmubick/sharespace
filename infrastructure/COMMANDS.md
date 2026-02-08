# Infrastructure Commands Reference

Quick reference for all infrastructure commands.

## Setup & Installation

```bash
# Install dependencies
npm install

# Bootstrap CDK (required once per AWS account/region)
cdk bootstrap
```

## Development Commands

### Type Checking
```bash
npm run type-check
```
Validates TypeScript without compiling.

### Building
```bash
npm run build
```
Compiles TypeScript to JavaScript.

### Watching for Changes
```bash
npm run watch
```
Automatically recompiles when files change. Useful during development.

## CloudFormation Template

### Synthesize
```bash
npm run synth
```
Generates CloudFormation template without deploying. Output goes to `cdk.out/`.

View the generated template:
```bash
cat cdk.out/ShareSpaceStack.template.json | jq .
```

## Deployment

### Preview Changes (Diff)

For development environment:
```bash
npm run diff:dev
```

For production environment:
```bash
npm run diff:prod
```

For custom environment:
```bash
ENVIRONMENT=staging cdk diff
```

### Deploy

For development environment:
```bash
npm run deploy:dev
```

For production environment:
```bash
npm run deploy:prod
```

For custom environment:
```bash
ENVIRONMENT=staging cdk deploy
```

### Destroy Infrastructure

```bash
# Destroy with confirmation prompt
cdk destroy

# Destroy without prompts (careful!)
cdk destroy --force
```

## Useful CDK CLI Options

### Verbose Output
```bash
cdk deploy --verbose
```

### Profile
```bash
cdk deploy --profile myprofile
```

### Skip Approval
```bash
cdk deploy --require-approval never
```

### List Stacks
```bash
cdk ls
```

### Get Stack Info
```bash
cdk metadata <stack-id>
```

## AWS CLI Integration

After deployment, these AWS CLI commands are useful:

### View Stack
```bash
aws cloudformation describe-stacks --stack-name ShareSpaceStack
```

### View Stack Events
```bash
aws cloudformation describe-stack-events --stack-name ShareSpaceStack
```

### View Stack Resources
```bash
aws cloudformation list-stack-resources --stack-name ShareSpaceStack
```

### View Outputs
```bash
aws cloudformation describe-stacks \
  --stack-name ShareSpaceStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Environment Variables

Control deployment with environment variables:

```bash
# Select environment (dev or prod)
export ENVIRONMENT=dev

# AWS Configuration
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=123456789012

# CDK Configuration
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1
```

## Troubleshooting Commands

### Check CloudFormation Status
```bash
aws cloudformation get-stack-status --stack-name ShareSpaceStack
```

### View Lambda Logs
```bash
aws logs tail /aws/apigateway/sharespace-api-dev --follow
```

### List S3 Buckets
```bash
aws s3 ls | grep sharespace
```

### List DynamoDB Tables
```bash
aws dynamodb list-tables --region us-east-1
```

### View API Gateway
```bash
aws apigateway get-rest-api --rest-api-id <API_ID>
```

## Full Deployment Workflow

```bash
# 1. Install dependencies
npm install

# 2. Type check
npm run type-check

# 3. Build
npm run build

# 4. Preview changes (for dev)
npm run diff:dev

# 5. Deploy (first time requires bootstrap)
cdk bootstrap
npm run deploy:dev

# 6. Get outputs
aws cloudformation describe-stacks \
  --stack-name ShareSpaceStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Cleanup

Destroy all resources:

```bash
cdk destroy --force
```

Or via AWS CloudFormation console:
1. Go to CloudFormation
2. Select ShareSpaceStack
3. Click Delete
4. Confirm

## Files Modified for Deployment

To understand what gets deployed, review:
- `lib/config.ts` - Resource naming
- `lib/stacks/*.ts` - Individual resource definitions
- `lib/sharespace-stack.ts` - Stack composition
- `bin/sharespace.ts` - App entry point
- `cdk.json` - CDK configuration
- `package.json` - Dependencies and scripts

## Getting Help

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

For infrastructure overview, see [INFRASTRUCTURE_SUMMARY.md](INFRASTRUCTURE_SUMMARY.md).

For general info, see [README.md](README.md).
