# Contributing

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Follow the development setup in [SETUP.md](SETUP.md)

## Development Workflow

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Format code with Prettier (if configured)
- Use meaningful variable and function names

### Commit Messages

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(upload): add media file validation

- Validate file size before upload
- Check file type against whitelist
- Show user-friendly error messages

Closes #123
```

### Testing

- Write tests for new features
- Ensure existing tests pass
- Test locally before submitting PR

```bash
# Run tests
npm test
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass locally
4. Submit PR with clear description
5. Address review comments

## Project Structure Guidelines

- Keep functions small and focused
- Use the existing folder structure
- Move shared code to `backend/shared/` or appropriate location
- Document complex logic with comments

## Frontend Guidelines

- Keep components under 300 lines
- Use custom hooks for logic
- Store API calls in services/
- Keep styles modular

## Backend Guidelines

- One Lambda function per service/resource
- Share common code via shared/
- Use TypeScript for type safety
- Add logging to help with debugging

## Infrastructure Guidelines

- Keep CDK stacks modular
- Document resource purposes
- Use AWS best practices
- Test infrastructure changes locally with `cdk diff`

## Questions?

Create an issue or discussion in the repository.
