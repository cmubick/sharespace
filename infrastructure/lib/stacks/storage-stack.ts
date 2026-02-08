import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import { Construct } from 'constructs'
import { EnvironmentConfig } from '../config'

export interface StorageStackProps extends cdk.StackProps {
  config: EnvironmentConfig
}

export class StorageStack extends cdk.Stack {
  public readonly frontendBucket: s3.Bucket
  public readonly mediaBucket: s3.Bucket
  public readonly frontendOai: cloudfront.OriginAccessIdentity
  public readonly mediaOai: cloudfront.OriginAccessIdentity

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props)

    const { config } = props

    // CloudFront Origin Access Identities (created here to avoid circular deps)
    this.frontendOai = new cloudfront.OriginAccessIdentity(
      this,
      'FrontendOAI'
    )
    this.mediaOai = new cloudfront.OriginAccessIdentity(this, 'MediaOAI')

    // S3 bucket for frontend hosting
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: config.frontend.bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy:
        config.env === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env === 'dev',
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    })

    // S3 bucket for media uploads
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: config.media.bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy:
        config.env === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env === 'dev',
      lifecycleRules: [
        {
          id: 'DeleteIncompleteUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
    })

    // Outputs
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
      exportName: `${config.projectName}-frontend-bucket`,
    })

    new cdk.CfnOutput(this, 'FrontendBucketArn', {
      value: this.frontendBucket.bucketArn,
      exportName: `${config.projectName}-frontend-bucket-arn`,
    })

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      description: 'S3 bucket for media uploads',
      exportName: `${config.projectName}-media-bucket`,
    })

    new cdk.CfnOutput(this, 'MediaBucketArn', {
      value: this.mediaBucket.bucketArn,
      exportName: `${config.projectName}-media-bucket-arn`,
    })
  }

  /**
   * Grant read/write permissions to media bucket for Lambda functions
   */
  grantMediaBucketPermissions(grantable: iam.IGrantable): void {
    this.mediaBucket.grantReadWrite(grantable)
  }

  /**
   * Grant read permissions to frontend bucket
   */
  grantFrontendBucketReadPermissions(grantable: iam.IGrantable): void {
    this.frontendBucket.grantRead(grantable)
  }
}
