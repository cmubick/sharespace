import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { EnvironmentConfig } from '../config'

export interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig
}

export class DatabaseStack extends cdk.Stack {
  public readonly mediaTable: dynamodb.Table
  public readonly usersTable: dynamodb.Table

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props)

    const { config } = props

    // Media metadata DynamoDB table
    this.mediaTable = new dynamodb.Table(this, 'MediaTable', {
      tableName: config.dynamodb.mediaTableName,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'mediaId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy:
        config.env === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    })

    // Global secondary index for querying by media type
    this.mediaTable.addGlobalSecondaryIndex({
      indexName: 'mediaTypeIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'mediaType',
        type: dynamodb.AttributeType.STRING,
      },
    })

    // Global secondary index for querying by upload date
    this.mediaTable.addGlobalSecondaryIndex({
      indexName: 'uploadDateIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'uploadedAt',
        type: dynamodb.AttributeType.STRING,
      },
    })

    // Users DynamoDB table
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: config.dynamodb.usersTableName,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy:
        config.env === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    })

    // Global secondary index for querying users by email
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'emailIndex',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
    })

    // Outputs
    new cdk.CfnOutput(this, 'MediaTableName', {
      value: this.mediaTable.tableName,
      description: 'DynamoDB table for media metadata',
      exportName: `${config.projectName}-media-table`,
    })

    new cdk.CfnOutput(this, 'MediaTableArn', {
      value: this.mediaTable.tableArn,
      exportName: `${config.projectName}-media-table-arn`,
    })

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'DynamoDB table for user data',
      exportName: `${config.projectName}-users-table`,
    })

    new cdk.CfnOutput(this, 'UsersTableArn', {
      value: this.usersTable.tableArn,
      exportName: `${config.projectName}-users-table-arn`,
    })
  }

  /**
   * Grant read/write permissions to media table
   */
  grantMediaTablePermissions(grantable: iam.IGrantable): void {
    this.mediaTable.grantReadWriteData(grantable)
  }

  /**
   * Grant read/write permissions to users table
   */
  grantUsersTablePermissions(grantable: iam.IGrantable): void {
    this.usersTable.grantReadWriteData(grantable)
  }

  /**
   * Grant all database permissions
   */
  grantAllDatabasePermissions(grantable: iam.IGrantable): void {
    this.grantMediaTablePermissions(grantable)
    this.grantUsersTablePermissions(grantable)
  }
}
