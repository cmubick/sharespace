# Setup Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- AWS Account
- AWS CLI configured with credentials
- Docker (for local Lambda testing)

## Initial Setup

### 1. Clone and Install

```bash
cd sharespace
npm install
```

### 2. Configure AWS Credentials

```bash
aws configure
```

Enter your AWS access key, secret key, and default region.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

### 4. Backend Setup

```bash
cd ../backend
npm install
npm run build
```

### 5. Infrastructure Setup

```bash
cd ../infrastructure
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# View what will be deployed
cdk diff

# Deploy infrastructure
cdk deploy
```

## Environment Variables

Copy `.env.example` files and customize:

```bash
cp backend/.env.example backend/.env
cp infrastructure/.env.example infrastructure/.env
```

## Development Workflow

### Frontend Development

```bash
cd frontend
npm run dev
```

### Backend Development

```bash
cd backend
npm run watch  # Compile on file changes
```

### Infrastructure Testing

```bash
cd infrastructure
cdk diff       # Review changes
cdk deploy     # Deploy to AWS
```

## Folder Structure Explanation

- **frontend/** - React web application
- **backend/lambdas/** - Lambda function handlers
- **backend/shared/** - Shared utilities and types
- **infrastructure/** - AWS CDK infrastructure definitions
- **docs/** - Project documentation

## Next Steps

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system design
2. See [../frontend/README.md](../frontend/README.md) for frontend-specific development
3. See [../backend/README.md](../backend/README.md) for backend-specific development
4. See [../infrastructure/README.md](../infrastructure/README.md) for infrastructure details
