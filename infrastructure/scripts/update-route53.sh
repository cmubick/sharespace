#!/bin/bash
# Update Route53 DNS records to point to CloudFront distribution

set -e

# Disable AWS CLI pager
export AWS_PAGER=""

ENVIRONMENT=${ENVIRONMENT:-dev}
PROJECT_NAME="sharespace"
STACK_NAME="ShareSpaceStack"

echo "🔍 Looking up CloudFront distribution domain..."

# Get the CloudFront distribution domain from the CloudFormation stack using jq
CF_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --output json 2>/dev/null | jq -r '.Stacks[0].Outputs[] | select(.OutputKey | contains("CdnStackFrontendDistributionDomainName")) | .OutputValue' || echo "")

if [ -z "$CF_DOMAIN" ]; then
  echo "❌ Could not find CloudFront domain in stack outputs"
  exit 1
fi

echo "✅ Found CloudFront domain: $CF_DOMAIN"

echo "📍 Checking environment..."

# Only update DNS for prod
if [ "$ENVIRONMENT" != "prod" ]; then
  echo "⚠️  Not in prod environment (ENVIRONMENT=$ENVIRONMENT) - skipping Route53 update"
  exit 0
fi

DOMAIN_NAME="itsonlycastlesburning.com"

# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --query "HostedZones[?Name=='${DOMAIN_NAME}.'].Id" \
  --output text 2>/dev/null | cut -d'/' -f3)

if [ -z "$ZONE_ID" ]; then
  echo "❌ Could not find Route53 hosted zone for $DOMAIN_NAME"
  exit 1
fi

echo "✅ Found hosted zone: $ZONE_ID"

# CloudFront hosted zone ID (always Z2FDTNDATAQYW2)
CF_ZONE_ID="Z2FDTNDATAQYW2"

# Update apex domain
echo "🔄 Updating Route53 record for $DOMAIN_NAME..."
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch "{
    \"Changes\": [
      {
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"$DOMAIN_NAME\",
          \"Type\": \"A\",
          \"AliasTarget\": {
            \"HostedZoneId\": \"$CF_ZONE_ID\",
            \"DNSName\": \"$CF_DOMAIN\",
            \"EvaluateTargetHealth\": false
          }
        }
      },
      {
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"*.$DOMAIN_NAME\",
          \"Type\": \"A\",
          \"AliasTarget\": {
            \"HostedZoneId\": \"$CF_ZONE_ID\",
            \"DNSName\": \"$CF_DOMAIN\",
            \"EvaluateTargetHealth\": false
          }
        }
      }
    ]
  }" 2>/dev/null

echo "✅ Route53 records updated successfully!"
echo "📝 Remember: DNS propagation may take a few minutes"
