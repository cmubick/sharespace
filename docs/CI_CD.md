# CI/CD Pipeline

## Overview

ShareSpace uses GitHub Actions for continuous integration and deployment.

## Workflows

### Main Deployment Workflow

Triggered on:
- Push to `main` branch
- Manual workflow dispatch

Steps:
1. **Setup**: Install dependencies
2. **Lint**: Check code style
3. **Type Check**: TypeScript type checking
4. **Build**: Compile frontend and backend
5. **Deploy**: Run CDK deploy to AWS
6. **Smoke Tests**: Verify deployment succeeded

## GitHub Actions Setup

### Prerequisites

1. GitHub repository configured
2. AWS credentials stored as secrets
3. Branch protection rules configured

### Required Secrets

Add to repository Settings → Secrets and variables → Actions:

```
AWS_ACCESS_KEY_ID          # AWS access key
AWS_SECRET_ACCESS_KEY      # AWS secret key
AWS_REGION                 # AWS region (optional, defaults to us-east-1)
SLACK_WEBHOOK_URL          # Optional: Slack notifications
```

### Environment Variables

Set in workflow or organization-level:

```
NODE_VERSION=18
VITE_API_BASE_URL=https://api.sharespace.example.com
```

## Workflow Configuration

Main workflow file: `.github/workflows/deploy.yml`

### Example Workflow

```yaml
name: Deploy ShareSpace

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: npm run deploy
```

## Branch Protection Rules

Recommended settings for `main` branch:

1. Require pull request reviews (1+)
2. Dismiss stale PR approvals
3. Require status checks to pass
4. Include administrators

## Pull Request Workflow

1. Create feature branch from `main`
2. Push commits
3. Open PR with description
4. Await CI checks to pass
5. Request code review
6. Address feedback
7. Merge when approved

## Deployment Strategy

### Development
- Automatic deployment on push to `develop` branch
- Can fail without blocking
- Used for testing

### Staging
- Manual trigger or merge to `staging` branch
- Requires review
- Used for QA

### Production
- Manual trigger or merge to `main` branch
- Requires multiple approvals
- Automated rollback on failure

## Monitoring

### Build Status

Check status at: GitHub → Actions → Workflows

### Logs

View detailed logs in workflow run details

### Notifications

Configure notifications:
- GitHub notifications (default)
- Slack integration (optional)
- Email alerts (optional)

## Troubleshooting

### Workflow Fails

1. Check logs in GitHub Actions
2. Review commit changes
3. Verify secrets are set
4. Check AWS permissions

### Deployment Issues

1. Review CDK diff
2. Check CloudFormation events
3. Verify IAM policies
4. Check service quotas

### Rollback

If deployment breaks production:

1. Revert commit
2. Push to `main`
3. Workflow automatically redeploys previous version

## Local Testing

Test workflow locally with act:

```bash
brew install act
act -j build-and-deploy
```

## Security

- Secrets never logged
- AWS credentials rotated regularly
- Principle of least privilege for IAM
- Audit trail for all deployments

## Cost Optimization

- Use caching for dependencies
- Parallel jobs where possible
- Only deploy on specific branches
- Monitor action usage
