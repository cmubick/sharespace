import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { EnvironmentConfig } from '../config'

export interface DatabaseStackProps {
  config: EnvironmentConfig
}

export class DatabaseStack extends Construct {
  public readonly mediaTable: dynamodb.Table
  public readonly usersTable: dynamodb.Table

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id)

    const { config } = props

    // Media metadata DynamoDB table
    this.mediaTable = new dynamodb.Table(this, 'MediaTable', {
      tableName: config.dynamodb.mediaTableName,
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy:
        config.env === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
    })

    // GSI1: query by year
    this.mediaTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'year',
        type: dynamodb.AttributeType.NUMBER,
      },
      sortKey: {
        name: 'uploadTimestamp',
        type: dynamodb.AttributeType.STRING,
      },
    })

    // GSI2: query by uploaderName
    this.mediaTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'uploaderName',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'uploadTimestamp',
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
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
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
