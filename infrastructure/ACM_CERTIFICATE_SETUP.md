# ACM Certificate Setup for CloudFront

## Overview

The ShareSpace infrastructure is now configured to use an ACM certificate for the custom domain `itsonlycastlesburning.com` with wildcard support for `*.itsonlycastlesburning.com`.

## Certificate Requirements

- **Domain**: `itsonlycastlesburning.com`
- **Wildcard**: `*.itsonlycastlesburning.com`
- **Region**: `us-east-1` (CloudFront requires certificates in us-east-1)
- **Type**: TLS/SSL certificate

## Deployment Steps

### 1. Obtain ACM Certificate

If you don't already have the certificate:

1. Go to AWS Console → Certificate Manager (ACM)
2. Click "Request a certificate"
3. Choose "Request a public certificate"
4. Add domains:
   - `itsonlycastlesburning.com`
   - `*.itsonlycastlesburning.com`
5. Choose DNS validation
6. Complete the DNS validation process

### 2. Deploy Infrastructure with Certificate ARN

Set the certificate ARN environment variable before deploying:

```bash
# For production deployment
export ACM_CERTIFICATE_ARN="arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"
export ENVIRONMENT=prod
cd /Users/chrisubick/repos/sharespace/infrastructure
npm run deploy:prod
```

### 3. Apply Certificate to Existing CloudFront Distribution

Due to CloudFront limitations, existing distributions cannot be updated with certificates after creation. Use the AWS CLI to update the existing distribution:

```bash
# Get the distribution ID
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='sharespace frontend distribution'].Id" \
  --output text)

# Get the current distribution config
aws cloudfront get-distribution-config \
  --id $DIST_ID > /tmp/dist-config.json

# Edit the config to add the certificate and domain names
# Update the ViewerCertificate section:
# {
#   "ACMCertificateArn": "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID",
#   "SSLSupportMethod": "sni-only",
#   "MinimumProtocolVersion": "TLSv1.2_2021",
#   "CertificateSource": "acm"
# }
#
# And add Aliases:
# {
#   "Quantity": 2,
#   "Items": ["itsonlycastlesburning.com", "*.itsonlycastlesburning.com"]
# }

# Update the distribution
aws cloudfront update-distribution \
  --id $DIST_ID \
  --distribution-config file:///tmp/dist-config.json
```

### 4. Configure DNS

After updating the distribution, create CNAME records:

- **Name**: `itsonlycastlesburning.com`
- **Value**: Your CloudFront distribution domain (e.g., `d1234567890abc.cloudfront.net`)

For wildcard:
- **Name**: `*.itsonlycastlesburning.com`
- **Value**: Same CloudFront distribution domain

### 5. Environment Deployments

- **Dev**: No custom domain configured (uses CloudFront default domain)
- **Prod**: Custom domain with ACM certificate

To deploy both:

```bash
# Dev deployment (no certificate needed)
export ENVIRONMENT=dev
npm run deploy:dev

# Prod deployment (requires ACM_CERTIFICATE_ARN)
export ACM_CERTIFICATE_ARN="arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"
export ENVIRONMENT=prod
npm run deploy:prod
```

## Configuration Details

The CDN stack configuration (`lib/stacks/cdn-stack.ts`):

- **Config domain**: Defined in `lib/config.ts` as `itsonlycastlesburning.com` for prod
- **Certificate import**: Uses `ACM_CERTIFICATE_ARN` environment variable
- **Domain Names**: Configured as `[itsonlycastlesburning.com, *.itsonlycastlesburning.com]` when certificate ARN is set
- **Existing distributions**: Can be updated via AWS CLI (see section 3 above)

## Updating Existing Distribution

If you have an existing CloudFront distribution without the certificate:

```bash
# Step 1: Get distribution ID and config
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='sharespace frontend distribution'].Id" \
  --output text)

aws cloudfront get-distribution-config --id $DIST_ID | jq . > dist-config.json

# Step 2: Edit dist-config.json to add:
# - ViewerCertificate with ACM certificate details
# - Aliases with custom domains

# Step 3: Extract ETag (required for update)
ETAG=$(aws cloudfront get-distribution-config \
  --id $DIST_ID \
  --query 'ETag' \
  --output text)

# Step 4: Update distribution
aws cloudfront update-distribution \
  --id $DIST_ID \
  --distribution-config file://dist-config.json \
  --if-match $ETAG
```

## Troubleshooting

### Certificate ARN not set
If you deploy without `ACM_CERTIFICATE_ARN`, CloudFront will still deploy but without HTTPS using the custom domain. Update manually via AWS CLI.

### DNS not resolving
After adding CNAME records, allow 5-15 minutes for DNS propagation before testing.

### Certificate validation errors
Ensure the certificate includes both:
- Base domain: `itsonlycastlesburning.com`
- Wildcard: `*.itsonlycastlesburning.com`

### Distribution cannot be updated
CloudFront distributions created without a certificate cannot be updated to use one directly in CDK. Use the AWS CLI manual update procedure above.

## Viewing Outputs

After deployment, check the stack outputs for:

```
FrontendDistributionDomainName: CloudFront default domain
FrontendCustomDomain: Your custom domain (prod only)
FrontendDistributionUrl: HTTPS URL for the frontend
```

## Certificate Renewal

ACM handles certificate renewal automatically. No action required—ACM will renew 60 days before expiration.

## New Deployments

For new deployments (clean infrastructure):

```bash
# With certificate from the start
export ACM_CERTIFICATE_ARN="arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"
export ENVIRONMENT=prod
npm run deploy:prod
```

The distribution will be created with the certificate and domain names configured automatically.

