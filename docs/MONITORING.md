# Monitoring

## CloudWatch

### Logs

Lambda logs automatically go to CloudWatch Logs:

```
/aws/lambda/sharespace-auth
/aws/lambda/sharespace-media
/aws/lambda/sharespace-user
```

View logs:
```bash
aws logs tail /aws/lambda/sharespace-auth --follow
```

### Metrics

CloudWatch automatically tracks:
- Lambda invocations
- Lambda duration
- Lambda errors
- API Gateway requests

### Alarms

Set up alarms for:
- Lambda error rate > 1%
- Lambda duration > 10s (p99)
- API Gateway 5xx errors
- DynamoDB throttling

Example alarm creation:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name sharespace-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Application Logging

Add logging to Lambda functions:

```typescript
console.log('Request received:', event)
console.error('Error processing:', error)
```

Logs appear in CloudWatch with Lambda function name and request ID.

## Dashboards

Create CloudWatch dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name ShareSpace \
  --dashboard-body file://dashboard.json
```

### Recommended Metrics

- API request count
- API latency (p50, p99)
- Lambda duration
- Lambda errors
- DynamoDB consumed capacity
- S3 request count

## Performance Monitoring

### Lambda Cold Starts

Monitor cold start duration:
- Check Duration metric with InitDuration
- Use Provisioned Concurrency for critical functions

### API Performance

Check API Gateway metrics:
- Latency
- 4xx/5xx error rates
- Request count

### Database Performance

Monitor DynamoDB:
- Consumed capacity
- User errors
- Throttled requests

## Health Checks

Implement health check endpoint:

```
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-08T12:00:00Z",
  "services": {
    "database": "healthy",
    "s3": "healthy"
  }
}
```

## Debugging

### Enable Debug Logging

Set environment variable:
```
DEBUG=true
```

Logs will include detailed information.

### X-Ray Tracing

Enable X-Ray for Lambda:
- Trace API requests
- Identify bottlenecks
- Monitor service map

```bash
aws xray put-trace-rule --rule-name ShareSpaceRule
```

## Alerts & Notifications

### Email Alerts

Configure SNS topic for email notifications:

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:sharespace-alerts \
  --protocol email \
  --notification-endpoint ops@example.com
```

### Slack Alerts

Integrate CloudWatch alarms with Slack:
1. Create Slack app
2. Configure SNS -> Slack integration
3. Subscribe alarms to SNS topic

## Operational Dashboards

Create team dashboard showing:
- Application status
- Recent errors
- Active users
- Recent deployments

## Log Analysis

Use CloudWatch Insights to analyze logs:

```
fields @timestamp, @message, @duration
| stats count() by @message
| sort count() desc
```

## Cost Monitoring

Monitor CloudWatch costs:
- Log ingestion (GB/month)
- Dashboard count
- Alarm count

Optimize by:
- Setting log retention (30 days default)
- Using metric filters instead of querying raw logs
- Consolidating dashboards
