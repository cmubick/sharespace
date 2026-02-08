# ShareSpace - Media Sharing Web App

A monorepo project for a modern AWS-hosted media sharing web application.

## Project Structure

```
.
├── frontend/           # React + Vite + TypeScript web application
├── backend/            # Node.js Lambda functions and shared utilities
│   ├── lambdas/       # AWS Lambda function handlers
│   └── shared/        # Shared libraries and utilities for backend services
├── infrastructure/     # AWS CDK TypeScript for cloud infrastructure
└── docs/              # Project documentation
```

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, TailwindCSS (recommended)
- **Backend**: Node.js, AWS Lambda, TypeScript
- **Infrastructure**: AWS CDK (TypeScript)
- **Cloud Services**: AWS (S3, API Gateway, DynamoDB, CloudFront, etc.)
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- AWS CLI configured with appropriate credentials
- AWS CDK CLI: `npm install -g aws-cdk`

### Installation

1. Clone the repository
2. Install dependencies for each workspace:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Infrastructure
cd ../infrastructure
npm install
```

### Development

- **Frontend**: See [frontend/README.md](frontend/README.md)
- **Backend**: See [backend/README.md](backend/README.md)
- **Infrastructure**: See [infrastructure/README.md](infrastructure/README.md)

### Deployment

Infrastructure changes are deployed via AWS CDK:

```bash
cd infrastructure
cdk deploy
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## CI/CD

This project uses GitHub Actions for continuous integration and deployment. See [docs/CI_CD.md](docs/CI_CD.md) for details.

## Contributing

Please see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for contribution guidelines.

## License

MIT
