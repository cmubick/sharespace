import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as path from 'path'
import { Construct } from 'constructs'
import { EnvironmentConfig } from '../config'

import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
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
        allowOrigins: ['https://itsonlycastlesburning.com'],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'],
        allowHeaders: ['Content-Type', 'Authorization'],
        statusCode: 200,
      },
    })

    // Ensure CORS headers on API Gateway-generated error responses
    this.api.addGatewayResponse('Default4xxWithCors', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
      },
    })

    this.api.addGatewayResponse('Default5xxWithCors', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
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

    // Add SES permissions for feedback emails
    this.lambdaExecutionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      })
    )

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

    const updateHandler = new lambda.Function(this, 'UpdateHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/media/update.handler',
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

    const deleteHandler = new lambda.Function(this, 'DeleteHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/media/delete.handler',
      code: lambda.Code.fromAsset(backendDistPath, {
        exclude: ['*.ts', '*.d.ts', '*.map'],
      }),
      role: this.lambdaExecutionRole,
      environment: {
        MEDIA_TABLE: mediaTable.tableName,
        MEDIA_BUCKET: mediaBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    })

    const thumbnailHandler = new lambda.Function(this, 'ThumbnailHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/media/thumbnail.handler',
      code: lambda.Code.fromAsset(backendDistPath, {
        exclude: ['*.ts', '*.d.ts', '*.map'],
      }),
      role: this.lambdaExecutionRole,
      environment: {
        MEDIA_BUCKET: mediaBucket.bucketName,
        MEDIA_TABLE: mediaTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    })

    const feedbackHandler = new lambda.Function(this, 'FeedbackHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/feedback/feedback.handler',
      code: lambda.Code.fromAsset(backendDistPath, {
        exclude: ['*.ts', '*.d.ts', '*.map'],
      }),
      role: this.lambdaExecutionRole,
      environment: {
        FEEDBACK_EMAIL: 'chrisubick@gmail.com',
        SES_SENDER_EMAIL: 'noreply@itsonlycastlesburning.com',
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    })

    mediaBucket.grantRead(thumbnailHandler, 'uploads/*')
    mediaBucket.grantPut(thumbnailHandler, 'thumbnails/*')

    mediaBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(thumbnailHandler),
      { prefix: 'uploads/' }
    )

    // API Gateway resources
    const authResource = this.api.root.addResource('auth')
    const loginResource = authResource.addResource('login')
    const signupResource = authResource.addResource('signup')
    const refreshResource = authResource.addResource('refresh')

    const mediaResource = this.api.root.addResource('media')
    const feedbackResource = this.api.root.addResource('feedback')
    const userResource = this.api.root.addResource('user')
    const profileResource = userResource.addResource('profile')

    // Add Lambda integrations with CORS response headers
    const uploadIntegration = new apigateway.LambdaIntegration(uploadHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
          },
        },
      ],
    })
    const listIntegration = new apigateway.LambdaIntegration(listHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
          },
        },
      ],
    })

    const updateIntegration = new apigateway.LambdaIntegration(updateHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
          },
        },
      ],
    })

    const deleteIntegration = new apigateway.LambdaIntegration(deleteHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
          },
        },
      ],
    })

    const feedbackIntegration = new apigateway.LambdaIntegration(feedbackHandler, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
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

    // Feedback endpoint
    feedbackResource.addMethod('POST', feedbackIntegration, {
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
    mediaIdResource.addMethod('PUT', updateIntegration, {
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
    mediaIdResource.addMethod('DELETE', deleteIntegration, {
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
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'https://itsonlycastlesburning.com'",
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST,PUT,DELETE'",
          },
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
  }

  /**
   * Grant Lambda execution role permissions to access resources
   */
  getLambdaExecutionRole(): iam.Role {
    return this.lambdaExecutionRole
  }
}
