# ShareSpace - GitHub CI/CD Configuration

This directory contains CI/CD workflow definitions for GitHub Actions.

## Workflows

### deploy.yml
- Triggered on: Push to `main` branch or manual workflow dispatch
- Runs: Infrastructure validation, backend build, frontend build
- Deploys: CDK infrastructure to AWS

## Setup

1. Add AWS credentials to GitHub secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (optional, defaults to us-east-1)

2. Update the CDK bootstrap if needed:
   ```bash
   cdk bootstrap
   ```

3. Configure GitHub branch protection rules to require CI passing

## Secrets Required

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION (optional)
```

These should be set in repository settings under Secrets and variables → Actions.
