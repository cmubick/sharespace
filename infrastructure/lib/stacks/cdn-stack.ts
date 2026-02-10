import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import { Construct } from 'constructs'
import { EnvironmentConfig } from '../config'

export interface CdnStackProps {
  config: EnvironmentConfig
  frontendBucket: s3.Bucket
  mediaBucket: s3.Bucket
  frontendOai: cloudfront.OriginAccessIdentity
  mediaOai: cloudfront.OriginAccessIdentity
}

export class CdnStack extends Construct {
  public readonly frontendDistribution: cloudfront.Distribution
  public readonly mediaDistribution: cloudfront.Distribution

  constructor(scope: Construct, id: string, props: CdnStackProps) {
    super(scope, id)

    const { config, frontendBucket, mediaBucket, frontendOai, mediaOai } = props

    // Import existing ACM certificate if domain is configured and ARN is provided (prod only)
    const certificateArn = process.env.ACM_CERTIFICATE_ARN
    let certificate: acm.ICertificate | undefined
    let domainNames: string[] | undefined
    
    if (config.domainName && certificateArn) {
      certificate = acm.Certificate.fromCertificateArn(
        this,
        'ExistingCertificate',
        certificateArn
      )
      domainNames = [config.domainName, `*.${config.domainName}`]
    }

    // CloudFront distribution for frontend
    this.frontendDistribution = new cloudfront.Distribution(
      this,
      'FrontendDistribution',
      {
        comment: `${config.projectName} frontend distribution`,
        defaultBehavior: {
          origin: new cloudfrontOrigins.S3Origin(frontendBucket, {
            originAccessIdentity: frontendOai,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(0),
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enableLogging: true,
        logBucket: this.createLogBucket(`${config.projectName}-cf-logs`),
        logIncludesCookies: false,
        domainNames: domainNames,
        certificate: certificate,
      }
    )

    // CloudFront distribution for media delivery
    this.mediaDistribution = new cloudfront.Distribution(
      this,
      'MediaDistribution',
      {
        comment: `${config.projectName} media distribution`,
        defaultBehavior: {
          origin: new cloudfrontOrigins.S3Origin(mediaBucket, {
            originAccessIdentity: mediaOai,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          compress: true,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        enableLogging: true,
        logBucket: this.createLogBucket(`${config.projectName}-cf-media-logs`),
      }
    )

    // Outputs
    new cdk.CfnOutput(this, 'FrontendDistributionDomainName', {
      value: this.frontendDistribution.distributionDomainName,
      description: 'CloudFront distribution domain for frontend',
      exportName: `${config.projectName}-frontend-cdn-domain`,
    })

    // Media distribution domain for outputs
    this.mediaDistribution.distributionDomainName
  }

  private createLogBucket(bucketName: string): s3.Bucket {
    // Get the root stack to access account information
    const stack = cdk.Stack.of(this)
    const accountId = stack.account || 'unknown'
    
    return new s3.Bucket(this, `LogBucket-${bucketName}`, {
      bucketName: `${bucketName}-${accountId}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          expiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })
  }
}
