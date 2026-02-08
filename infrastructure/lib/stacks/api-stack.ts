import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import { EnvironmentConfig } from '../config'

export interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi
  public readonly lambdaExecutionRole: iam.Role

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    const { config } = props

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

    // API Gateway resources - placeholders for Lambda integration
    const authResource = this.api.root.addResource('auth')
    const loginResource = authResource.addResource('login')
    const signupResource = authResource.addResource('signup')
    const refreshResource = authResource.addResource('refresh')

    const mediaResource = this.api.root.addResource('media')
    const userResource = this.api.root.addResource('user')
    const profileResource = userResource.addResource('profile')

    // Add placeholder integration responses
    this.addPlaceholderIntegration(loginResource, 'POST', '/auth/login')
    this.addPlaceholderIntegration(signupResource, 'POST', '/auth/signup')
    this.addPlaceholderIntegration(refreshResource, 'POST', '/auth/refresh')

    this.addPlaceholderIntegration(mediaResource, 'GET', '/media')
    this.addPlaceholderIntegration(mediaResource, 'POST', '/media/upload')

    const mediaIdResource = mediaResource.addResource('{id}')
    this.addPlaceholderIntegration(mediaIdResource, 'GET', '/media/{id}')
    this.addPlaceholderIntegration(mediaIdResource, 'DELETE', '/media/{id}')

    this.addPlaceholderIntegration(profileResource, 'GET', '/user/profile')
    this.addPlaceholderIntegration(profileResource, 'PUT', '/user/profile')
    this.addPlaceholderIntegration(userResource, 'DELETE', '/user')

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${config.projectName}-api-endpoint`,
    })

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway REST API ID',
      exportName: `${config.projectName}-api-id`,
    })

    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'Lambda execution role ARN',
      exportName: `${config.projectName}-lambda-role-arn`,
    })
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
