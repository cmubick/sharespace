import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { getConfig } from './config'
import { StorageStack } from './stacks/storage-stack'
import { DatabaseStack } from './stacks/database-stack'
import { CdnStack } from './stacks/cdn-stack'
import { ApiStack } from './stacks/api-stack'

export class ShareSpaceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Get environment configuration
    const env = process.env.ENVIRONMENT || 'dev'
    const config = getConfig(env)

    // Storage Stack - S3 buckets
    const storageStack = new StorageStack(this, 'StorageStack', {
      config,
    })

    // Database Stack - DynamoDB tables
    const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      config,
    })

    // API Stack - API Gateway and Lambda role
    const apiStack = new ApiStack(this, 'ApiStack', {
      config,
      mediaBucket: storageStack.mediaBucket,
      mediaTable: databaseStack.mediaTable,
    })

    // CDN Stack - CloudFront distributions
    // Must be created after storage stack and pass OAI objects to avoid circular dependencies
    // Variable is intentionally unused (construct is created for side effects)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    new CdnStack(this, 'CdnStack', {
      config,
      frontendBucket: storageStack.frontendBucket,
      mediaBucket: storageStack.mediaBucket,
      frontendOai: storageStack.frontendOai,
      mediaOai: storageStack.mediaOai,
    })

    // Grant CDN OAI access to buckets (buckets hold references to OAI, not vice versa)
    storageStack.frontendBucket.grantRead(storageStack.frontendOai)
    storageStack.mediaBucket.grantRead(storageStack.mediaOai)

    // Grant Lambda execution role permissions to access resources
    const lambdaRole = apiStack.getLambdaExecutionRole()
    storageStack.grantMediaBucketPermissions(lambdaRole)
    databaseStack.grantAllDatabasePermissions(lambdaRole)
    new cdk.CfnOutput(this, 'Environment', {
      value: config.env,
      description: 'Deployment environment',
      exportName: `${config.projectName}-environment`,
    })

    new cdk.CfnOutput(this, 'ProjectName', {
      value: config.projectName,
      description: 'Project name',
      exportName: `${config.projectName}-project-name`,
    })

    new cdk.CfnOutput(this, 'Region', {
      value: this.node.root.node.tryGetContext('region') || 'us-east-1',
      description: 'AWS region',
      exportName: `${config.projectName}-region`,
    })

    new cdk.CfnOutput(this, 'Account', {
      value: this.account || 'unknown',
      description: 'AWS account ID',
      exportName: `${config.projectName}-account`,
    })

    // Summary of all resources
    new cdk.CfnOutput(this, 'InfrastructureSummary', {
      value: `
        Frontend Bucket: ${config.frontend.bucketName}
        Media Bucket: ${config.media.bucketName}
        Media Table: ${config.dynamodb.mediaTableName}
        Users Table: ${config.dynamodb.usersTableName}
        API Name: ${config.api.name}
      `.trim(),
      description: 'Infrastructure summary',
    })
  }
}
