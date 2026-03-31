# Contributing to TaskPilot AI

Thank you for your interest in contributing to TaskPilot AI! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/taskpilot-ai.git
   cd taskpilot-ai
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our [coding standards](#coding-standards)

3. Write or update tests for your changes

4. Ensure all tests pass:
   ```bash
   npm test
   ```

5. Ensure code builds without errors:
   ```bash
   npm run build
   ```

6. Format your code:
   ```bash
   npm run format
   ```

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

Examples:
```
feat(verifier): add evidence validation

Implement quality scoring for evidence entries with pattern detection
for suspicious content. Evidence below threshold triggers warnings.

Closes #42
```

## Coding Standards

### TypeScript

- Use strict TypeScript (`strict: true` in tsconfig.json)
- Avoid `any` types - use proper typing
- Export interfaces for public APIs
- Document complex functions with JSDoc comments

### Code Style

- Use Prettier for formatting (run `npm run format`)
- Follow existing code patterns
- Keep functions small and focused (< 50 lines when possible)
- Use meaningful variable and function names

### Testing

- Write tests for all new features
- Maintain test coverage thresholds:
  - Branches: 70%
  - Functions: 75%
  - Lines: 80%
  - Statements: 80%
- Test both success and failure cases
- Use descriptive test names: `it('should validate evidence with quality score below threshold')`

### Project Structure

```
src/
├── index.ts              # MCP server definition
├── taskEngine.ts         # Core orchestration
├── verifier.ts           # Completion audit logic
├── driftDetector.ts      # Anti-drift checks
├── stateTracker.ts       # State history
├── workBreakdownGenerator.ts  # Task generation
├── validators.ts         # Input validation
├── types.ts              # TypeScript interfaces
└── lib/
    ├── db.ts             # Database layer
    └── id.ts             # ID generation
```

## Pull Request Process

1. Update documentation if you've changed APIs or added features
2. Update CHANGELOG.md with your changes
3. Ensure all tests pass and coverage thresholds are met
4. Update README.md if necessary
5. Submit your pull request

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Code formatted with Prettier
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] PR description explains the change

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Use Jest with TypeScript:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { TaskEngine } from './taskEngine.js';

describe('TaskEngine', () => {
  let engine: TaskEngine;

  beforeEach(() => {
    engine = new TaskEngine();
  });

  it('should create project with correct initial state', () => {
    const project = engine.createProject('Test', 'Objective', 'Criteria');
    expect(project.status).toBe('draft');
    expect(project.healthScore).toBe(50);
  });
});
```

## Areas for Contribution

### High Priority

- **Web Dashboard**: Build React/Vue/Svelte dashboard for project visualization
- **Advanced Drift Detection**: Implement semantic drift detection using AI
- **Multi-Agent Orchestration**: Support for coordinating multiple AI agents
- **External Integrations**: GitHub, Jira, Linear, Asana connectors
- **Memory Search**: Implement full-text search across memory entries

### Medium Priority

- **Performance Optimization**: Query optimization, caching, batch operations
- **Export/Import**: Project backup and restore functionality
- **Retry Engine**: Automatic recovery from failures
- **Analytics**: Project completion time analysis, bottleneck detection
- **Custom Verifiers**: Plugin system for custom completion criteria

### Documentation

- API reference documentation
- Architecture decision records (ADRs)
- Tutorial videos
- Real-world usage examples
- Deployment guides (Docker, Kubernetes)

## Architecture Guidelines

### Adding New Features

1. **Core Engine Changes**: Modifications to `taskEngine.ts` should be minimal. Prefer creating new services.

2. **New Services**: Follow the existing pattern:
   ```typescript
   export class NewService {
     // Private methods for internal logic
     private helperMethod(): void { }

     // Public methods for TaskEngine to call
     public mainFeature(): Result { }
   }
   ```

3. **Database Changes**: Add migrations for schema changes. Update `db.ts` with new tables/indexes.

4. **MCP Tools**: Add new tools in `index.ts`. Use Zod for validation.

5. **Validators**: Add validation logic in `validators.ts`.

### Design Principles

- **Separation of Concerns**: Each module has one clear responsibility
- **Testability**: All business logic should be unit testable
- **Immutability**: Prefer immutable data structures
- **Explicit State**: No hidden state - everything should be in the database
- **Enforcement Over Trust**: Validate and enforce rules at the architecture level

## Release Process

Releases are handled by maintainers:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag: `git tag v0.x.0`
4. Push tag: `git push origin v0.x.0`
5. GitHub Actions automatically publishes to npm

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
