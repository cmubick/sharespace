# Architecture

## System Overview

ShareSpace is a distributed media sharing application built on AWS with a modern frontend and serverless backend.

```
┌─────────────────────────────────────────────────────────────┐
│                      CloudFront CDN                          │
└──────────────┬──────────────────────────────┬────────────────┘
               │                              │
               ▼                              ▼
        ┌──────────────┐           ┌──────────────────┐
        │  S3 Bucket   │           │  API Gateway     │
        │  (Frontend)  │           │  (REST API)      │
        └──────────────┘           └────────┬─────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
             ┌─────────────┐         ┌─────────────┐        ┌─────────────┐
             │   Lambda    │         │   Lambda    │        │   Lambda    │
             │    Auth     │         │    Media    │        │    User     │
             └─────────────┘         └─────────────┘        └─────────────┘
                    │                       │                       │
                    └───────────────────────┼───────────────────────┘
                                            │
                        ┌───────────────────┼───────────────────┐
                        │                   │                   │
                        ▼                   ▼                   ▼
                  ┌──────────┐        ┌──────────┐        ┌──────────┐
                  │ DynamoDB │        │   S3     │        │CloudWatch│
                  │  (Data)  │        │ (Media)  │        │  (Logs)  │
                  └──────────┘        └──────────┘        └──────────┘
```

## Layers

### Frontend Layer
- **Technology**: React + TypeScript + Vite
- **Hosting**: AWS S3 + CloudFront
- **Purpose**: User interface for media sharing
- **Features**: Upload, view, share media files

### API Layer
- **Technology**: API Gateway + Lambda
- **Authentication**: Lambda authorizers (JWT)
- **Purpose**: REST endpoints for application logic

### Backend Services
- **Technology**: Node.js Lambda functions
- **Services**:
  - Auth: User authentication and token management
  - Media: Upload, process, and manage media
  - User: User profile and settings
  - Share: Media sharing and permissions

### Data Layer
- **Technology**: DynamoDB, S3
- **Data**: User data in DynamoDB, media files in S3

## Request Flow

1. User accesses frontend via CloudFront
2. Frontend makes API calls to API Gateway
3. API Gateway routes to appropriate Lambda
4. Lambda processes request and queries DynamoDB/S3
5. Response returned through API Gateway to frontend

## Deployment

```
Code Repository
      │
      ▼
GitHub Actions
      │
      ├─→ Lint & Test
      │
      ├─→ Build Frontend
      │
      ├─→ Build Backend
      │
      └─→ Deploy Infrastructure (CDK)
              │
              ▼
           AWS Cloud
```

## Security

- **Authentication**: JWT tokens via Lambda authorizers
- **CORS**: Configured in API Gateway
- **HTTPS**: Enforced via CloudFront
- **S3**: Private bucket with signed URLs for media
- **Secrets**: AWS Secrets Manager for sensitive data

## Scalability

- **Frontend**: CloudFront caching and S3 auto-scaling
- **Backend**: Lambda auto-scaling
- **Database**: DynamoDB on-demand capacity
- **Media**: S3 unlimited storage

## Cost Optimization

- **CloudFront**: Reduces origin requests
- **Lambda**: Pay per invocation
- **DynamoDB**: On-demand pricing
- **S3**: Standard storage with lifecycle policies
