#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { ShareSpaceStack } from '../lib/sharespace-stack'

const app = new cdk.App()

// Get environment from context, environment variable, or default to 'dev'
const env = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev'

console.log(`🚀 Deploying ShareSpace infrastructure for environment: ${env}`)

new ShareSpaceStack(app, 'ShareSpaceStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
  },
  tags: {
    Environment: env,
    Project: 'sharespace',
    ManagedBy: 'cdk',
  },
})

app.synth()
