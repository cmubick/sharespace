# Troubleshooting

## Common Issues

### Deployment Issues

#### CDK Bootstrap Not Done
```
Error: This stack uses assets, so the toolkit stack must be deployed to the environment
```

Solution:
```bash
cdk bootstrap
```

#### Insufficient Permissions
```
Error: User is not authorized to perform: cdk:DeployStack
```

Solution:
- Ensure AWS credentials are configured
- Check IAM permissions include CloudFormation, Lambda, S3, etc.
- Run: `aws sts get-caller-identity` to verify

#### Stack Creation Failed
```
Error: Stack creation failed
```

Solution:
1. Check CloudFormation events in AWS Console
2. Review error message for specific issue
3. Fix issue and retry `cdk deploy`
4. Use `cdk diff` to validate changes first

### Lambda Issues

#### Lambda Timeout
```
Task timed out after 30.00 seconds
```

Solution:
- Increase timeout in CDK stack
- Optimize Lambda code
- Ensure database/external calls aren't hanging

#### Out of Memory
```
Process exited before completing request
```

Solution:
- Increase Lambda memory allocation
- Optimize code for memory usage
- Check for memory leaks

#### Cold Start Issues
```
Initialization timeout
```

Solution:
- Use Provisioned Concurrency for critical functions
- Reduce Lambda package size
- Remove unused dependencies

#### Cannot Access S3
```
NoCredentialsError: Missing credentials in configuration
```

Solution:
- Ensure Lambda has S3 permissions via IAM role
- Check bucket policy allows Lambda access
- Verify bucket name is correct

### Frontend Issues

#### API Endpoint Not Found
```
Failed to fetch
```

Solution:
- Verify API Gateway endpoint is deployed
- Check VITE_API_BASE_URL environment variable
- Ensure CORS is configured in API Gateway

#### Module Not Found
```
Module not found: '@shared/types'
```

Solution:
- Check import paths match actual file structure
- Verify Vite config includes necessary path aliases
- Check TypeScript config includes proper paths

#### Build Fails
```
error TS2307: Cannot find module
```

Solution:
- Run `npm install` to install dependencies
- Check tsconfig.json is correct
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Backend Issues

#### TypeScript Compilation Error
```
error TS2339: Property 'handler' does not exist
```

Solution:
- Check Lambda handler exports correctly
- Verify TypeScript types are correct
- Run `npm run type-check` to find errors

#### Missing Dependencies
```
Cannot find module 'aws-lambda'
```

Solution:
```bash
npm install
npm run build
```

### Database Issues

#### DynamoDB Table Not Found
```
ResourceNotFoundException: Requested resource not found
```

Solution:
- Verify table exists in AWS Console
- Check table name matches code
- Ensure region is correct

#### DynamoDB Throttling
```
ProvisionedThroughputExceededException
```

Solution:
- Increase DynamoDB capacity
- Use on-demand billing instead
- Optimize queries to reduce consumed capacity

### S3 Issues

#### Access Denied
```
AccessDenied: Access Denied
```

Solution:
- Check bucket policy allows Lambda
- Verify Lambda IAM role has S3:GetObject, S3:PutObject
- Check bucket is not using object lock

#### Bucket Already Exists
```
BucketAlreadyExists: The requested bucket name is not available
```

Solution:
- Use unique bucket name
- S3 bucket names are globally unique
- Try adding random suffix: `sharespace-media-{uniqueId}`

### Local Development

#### Port Already In Use
```
Error: listen EADDRINUSE: address already in use :::5173
```

Solution:
```bash
# Find and kill process using port 5173
lsof -i :5173
kill -9 <PID>

# Or use different port
npm run dev -- --port 5174
```

#### Node Modules Corrupted
```
Module build failed
```

Solution:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Getting Help

### Check Logs

1. **Frontend**: Browser dev tools (F12)
2. **Lambda**: CloudWatch Logs
3. **Infrastructure**: CloudFormation events
4. **Backend Build**: Terminal output

### Debug Mode

Enable debug logging:
```bash
# Backend
DEBUG=true npm run build

# Infrastructure  
DEBUG=true cdk deploy
```

### AWS Console

Check AWS Console for:
- CloudFormation stacks and events
- Lambda function logs
- API Gateway request logs
- S3 bucket contents
- DynamoDB items

### Stack Trace Analysis

When debugging errors:
1. Identify the error message
2. Find which component failed
3. Check that component's logs
4. Search docs/TROUBLESHOOTING.md
5. Create GitHub issue if needed

## Preventive Measures

- Run `npm run type-check` before committing
- Test locally with `cdk diff` before deploying
- Use CloudWatch alarms for monitoring
- Keep dependencies updated
- Document custom configurations
- Backup database before major changes
