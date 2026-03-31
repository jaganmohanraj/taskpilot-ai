# Contributing to TaskPilot AI

Thank you for your interest in contributing to TaskPilot AI! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Basic understanding of TypeScript
- Familiarity with MCP (Model Context Protocol)

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

### Branch Naming

Use descriptive branch names:
- `feature/add-retry-logic`
- `fix/verifier-bypass-issue`
- `docs/update-api-reference`
- `test/add-drift-detector-tests`

### Development Scripts

```bash
# Development mode with auto-reload
npm run dev

# Type checking
npm run check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Format code
npm run format

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our [coding standards](#coding-standards)

3. Write or update tests for your changes

4. Ensure all tests pass:
   ```bash
   npm test
   ```

5. Format your code:
   ```bash
   npm run format
   ```

6. Commit your changes with a descriptive message:
   ```bash
   git commit -m "feat: add retry logic for failed tasks"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

Examples:
```
feat: add semantic search to memory system
fix: prevent verifier bypass in status updates
docs: update API reference for new tools
test: add comprehensive drift detector tests
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`npm test`)
2. ✅ Code is formatted (`npm run format`)
3. ✅ Type checking passes (`npm run check`)
4. ✅ Documentation is updated
5. ✅ CHANGELOG.md is updated (if applicable)

### Submitting a PR

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template with:
   - Clear description of changes
   - Motivation and context
   - Related issue numbers
   - Screenshots (if UI changes)
   - Testing instructions

4. Request review from maintainers

### PR Review Process

- Maintainers will review your PR within 2-3 business days
- Address any requested changes
- Once approved, a maintainer will merge your PR

### After Merge

- Your contribution will be included in the next release
- You'll be added to the contributors list
- Delete your feature branch

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Enable strict mode
- Provide type annotations for public APIs
- Avoid `any` types - use `unknown` if necessary

### Code Style

We use Prettier for formatting with these settings:
- Single quotes
- Semicolons required
- Trailing commas (ES5)
- Print width: 100
- Arrow function parens: avoid

### File Organization

```
src/
├── index.ts           # MCP server entry point
├── types.ts           # Shared type definitions
├── taskEngine.ts      # Core orchestration
├── verifier.ts        # Completion audit logic
├── driftDetector.ts   # Anti-drift detection
├── stateTracker.ts    # State history tracking
├── workBreakdownGenerator.ts  # Task generation
└── lib/
    ├── db.ts          # Database layer
    └── id.ts          # ID generation
```

### Naming Conventions

- **Classes**: PascalCase (`TaskEngine`, `Verifier`)
- **Functions**: camelCase (`createProject`, `runAudit`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TASKS`, `DEFAULT_PRIORITY`)
- **Interfaces**: PascalCase with descriptive names (`Project`, `AuditResult`)
- **Files**: camelCase (`taskEngine.ts`, `driftDetector.ts`)

## Testing Guidelines

### Test Structure

```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = methodName(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Test Coverage

- Aim for 80%+ code coverage
- Test happy paths and edge cases
- Test error conditions
- Test state transitions thoroughly
- Test gate enforcement mechanisms

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- verifier.test.ts

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Explain complex logic with inline comments
- Keep comments up-to-date with code changes

Example:
```typescript
/**
 * Run completion audit on a project
 * @param projectId - The project to audit
 * @returns Audit result with pass/fail and score
 */
runCompletionAudit(projectId: string): AuditResult {
  // Implementation
}
```

### Documentation Files

Update relevant docs when making changes:
- `README.md` - High-level overview and quick start
- `docs/architecture.md` - System architecture
- `docs/blueprint.md` - Core design principles
- `docs/operating-model.md` - Standard workflows
- `CHANGELOG.md` - Version history

## Areas for Contribution

### High Priority

- 🧪 **Test Coverage**: Add tests for untested components
- 🚪 **Gate Enforcement**: Strengthen verifier bypass prevention
- 🔄 **Retry Logic**: Implement automatic retry for failed tasks
- 📊 **Web Dashboard**: Build React-based UI

### Medium Priority

- 🧠 **Intelligent Memory**: Add semantic search and contradiction detection
- 📈 **Analytics**: Add project insights and completion predictions
- 🔗 **Integrations**: Connect with external tools (Jira, GitHub, etc.)
- 📚 **Examples**: Create example workflows and tutorials

### Good First Issues

Look for issues labeled `good-first-issue` in the GitHub issues.

## Questions?

- Open a GitHub Discussion
- Check existing issues
- Review the documentation in `/docs`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TaskPilot AI! 🎯
