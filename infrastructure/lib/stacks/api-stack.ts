import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as path from 'path'
import { Construct } from 'constructs'
import { EnvironmentConfig } from '../config'

import * as s3 from 'aws-cdk-lib/aws-s3'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'

export interface ApiStackProps {
  config: EnvironmentConfig
  mediaBucket: s3.Bucket
  mediaTable: dynamodb.Table
}

export class ApiStack extends Construct {
  public readonly api: apigateway.RestApi
  public readonly lambdaExecutionRole: iam.Role

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id)

    const { config, mediaBucket, mediaTable } = props

    // CloudWatch log group for API Gateway
    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/apigateway/${config.api.name}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // REST API
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: config.api.name,
      description: 'ShareSpace Media Sharing API',
      deployOptions: {
        stageName: config.env,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: config.env === 'dev',
        tracingEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        statusCode: 200,
      },
    })

    // Create Lambda execution role with basic policies
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${config.projectName}-lambda-execution-${config.env}`,
      description: 'Lambda execution role for ShareSpace functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AWSXRayDaemonWriteAccess'
        ),
      ],
    })

    // Create Lambda functions for handlers
    // Use the full dist directory which includes node_modules and compiled code
    const backendDistPath = path.resolve(path.join(__dirname, '../../../..', 'backend/dist'))
    
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/media/upload.handler',
      code: lambda.Code.fromAsset(backendDistPath, {
        exclude: ['*.ts', '*.d.ts', '*.map'],
      }),
      role: this.lambdaExecutionRole,
      environment: {
        MEDIA_BUCKET: mediaBucket.bucketName,
        MEDIA_TABLE: mediaTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    })

    const listHandler = new lambda.Function(this, 'ListHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/media/list.handler',
      code: lambda.Code.fromAsset(backendDistPath, {
        exclude: ['*.ts', '*.d.ts', '*.map'],
      }),
      role: this.lambdaExecutionRole,
      environment: {
        MEDIA_TABLE: mediaTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    })

    // API Gateway resources
    const authResource = this.api.root.addResource('auth')
    const loginResource = authResource.addResource('login')
    const signupResource = authResource.addResource('signup')
    const refreshResource = authResource.addResource('refresh')

    const mediaResource = this.api.root.addResource('media')
    const userResource = this.api.root.addResource('user')
    const profileResource = userResource.addResource('profile')

    // Add Lambda integrations with CORS response headers
    const uploadIntegration = new apigateway.LambdaIntegration(uploadHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
          },
        },
      ],
    })
    const listIntegration = new apigateway.LambdaIntegration(listHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
          },
        },
      ],
    })

    // Media endpoints
    mediaResource.addMethod('POST', uploadIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
        },
      ],
    })
    mediaResource.addMethod('GET', listIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
        },
      ],
    })

    // Add placeholder integrations for other endpoints
    this.addPlaceholderIntegration(loginResource, 'POST', '/auth/login')
    this.addPlaceholderIntegration(signupResource, 'POST', '/auth/signup')
    this.addPlaceholderIntegration(refreshResource, 'POST', '/auth/refresh')

    const mediaIdResource = mediaResource.addResource('{id}')
    this.addPlaceholderIntegration(mediaIdResource, 'GET', '/media/{id}')
    this.addPlaceholderIntegration(mediaIdResource, 'DELETE', '/media/{id}')

    this.addPlaceholderIntegration(profileResource, 'GET', '/user/profile')
    this.addPlaceholderIntegration(profileResource, 'PUT', '/user/profile')
    this.addPlaceholderIntegration(userResource, 'DELETE', '/user')
  }

  /**
   * Add a placeholder integration to an API resource
   * This will be replaced with actual Lambda integrations later
   */
  private addPlaceholderIntegration(
    resource: apigateway.Resource,
    method: string,
    path: string
  ): void {
    const mockIntegration = new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': `{
              "message": "Placeholder for ${path}",
              "path": "${path}",
              "method": "${method}"
            }`,
          },
        },
      ],
    })

    resource.addMethod(method, mockIntegration, {
      methodResponses: [{ statusCode: '200' }],
    })
  }

  /**
   * Grant Lambda execution role permissions to access resources
   */
  getLambdaExecutionRole(): iam.Role {
    return this.lambdaExecutionRole
  }
}
