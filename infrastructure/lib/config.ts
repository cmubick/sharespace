/**
 * Infrastructure configuration based on environment
 */

export interface EnvironmentConfig {
  env: 'dev' | 'prod'
  region: string
  domainName?: string
  projectName: string
  frontend: {
    bucketName: string
  }
  media: {
    bucketName: string
  }
  api: {
    name: string
  }
  dynamodb: {
    mediaTableName: string
    usersTableName: string
  }
}

export const getConfig = (env: string): EnvironmentConfig => {
  const isDev = env === 'dev'
  const envSuffix = isDev ? 'dev' : 'prod'
  const projectName = 'sharespace'

  return {
    env: isDev ? 'dev' : 'prod',
    region: process.env.AWS_REGION || 'us-east-1',
    projectName,
    domainName: isDev ? undefined : 'itsonlycastlesburning.com',
    frontend: {
      bucketName: `${projectName}-frontend-${envSuffix}`,
    },
    media: {
      bucketName: `${projectName}-media-${envSuffix}`,
    },
    api: {
      name: `${projectName}-api-${envSuffix}`,
    },
    dynamodb: {
      mediaTableName: `${projectName}-media-${envSuffix}`,
      usersTableName: `${projectName}-users-${envSuffix}`,
    },
  }
}
