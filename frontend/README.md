# Frontend

React + Vite + TypeScript web application for ShareSpace.

## Overview

This directory contains the frontend web application built with:
- **React 18** - UI framework
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Responsive Design** - Mobile-first approach

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/          # Page-level components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services and external integrations
│   ├── styles/         # Global styles and utilities
│   ├── types/          # TypeScript types and interfaces
│   ├── App.tsx         # Root component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite configuration
└── index.html          # HTML entry point
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Server runs at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output goes to `dist/`

### Preview Production Build

```bash
npm run preview
```

### Type Checking

```bash
npm run type-check
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_AWS_REGION=us-east-1
```

## Building & Deployment

Frontend assets are built and deployed to AWS CloudFront/S3 as part of the infrastructure deployment. See the infrastructure README for deployment details.

## Best Practices

- Keep components small and focused
- Use TypeScript for type safety
- Follow the existing folder structure
- Write meaningful component names
- Use CSS modules or Tailwind for styling
- Keep API logic in services/

## Testing

(To be configured)

## Contributing

See [../docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md)
