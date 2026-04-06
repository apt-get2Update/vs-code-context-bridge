# Contributing to Context Bridge

Thank you for your interest in contributing to Context Bridge! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- npm 9+
- VS Code 1.85+ or Cursor
- Git

### Development Setup

```bash
git clone https://github.com/your-org/context-bridge.git
cd context-bridge
npm install
npm run compile
```

### Running the Extension

1. Open the project in VS Code/Cursor
2. Press `F5` to launch the Extension Development Host
3. Test commands via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)

### Running Tests

```bash
npm test
```

### Linting and Formatting

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format        # Format code
npm run format:check  # Verify formatting
```

## How to Contribute

### Reporting Bugs

1. Check existing issues first to avoid duplicates
2. Use the bug report template
3. Include:
   - OS and version
   - VS Code/Cursor version
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs from the "Context Bridge" output channel

### Suggesting Features

1. Open a feature request issue
2. Describe the use case and motivation
3. If possible, outline a proposed implementation

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add/update tests for new functionality
5. Ensure all tests pass: `npm test`
6. Ensure lint passes: `npm run lint`
7. Commit with a descriptive message
8. Push to your fork and open a Pull Request

### Commit Messages

Follow conventional commit format:

```
type(scope): description

feat(extractor): add support for pyproject.toml parsing
fix(matcher): correct keyword scoring when no keywords exist
docs(readme): add troubleshooting section
test(applier): add idempotency test for workflow content
chore(deps): update TypeScript to 5.4
```

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`

## Project Structure

```
src/
├── extension.ts          # Extension entry point
├── commands/             # Command handlers
│   ├── capture.ts
│   ├── suggest.ts
│   ├── apply.ts
│   ├── open-store.ts
│   └── validate.ts
├── core/                 # Core business logic
│   ├── context-model.ts
│   ├── extractor.ts
│   ├── matcher.ts
│   ├── applier.ts
│   └── validator.ts
├── storage/              # Persistence layer
│   ├── store.ts
│   └── migrations.ts
├── types/                # TypeScript interfaces
│   ├── context.ts
│   ├── store.ts
│   ├── suggestion.ts
│   └── validation.ts
└── utils/                # Shared utilities
    ├── fs.ts
    ├── logger.ts
    ├── platform.ts
    └── redaction.ts
```

## Guidelines

### Code Style

- TypeScript strict mode is enforced
- ESLint + Prettier configuration is provided
- All functions should have explicit return types
- Use `async/await` over raw promises
- Handle errors gracefully — never let the extension crash

### Testing

- Write unit tests for all core logic
- Place tests in `test/unit/` mirroring the source structure
- Use fixtures from `fixtures/` for file-based tests
- Tests must pass on macOS, Linux, and Windows

### Cross-Platform

- Use `path.join()` for all file paths
- Use `os.homedir()` for user directories
- Never use shell commands or OS-specific APIs
- Test path handling for both `/` and `\` separators

### Security

- Never log or store secret values
- Use the `redactSecrets()` utility for all user-facing output
- Only capture environment variable **names**, never values
- Review the redaction patterns if adding new data sources

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag: `git tag v0.x.0`
4. Push tag: `git push origin v0.x.0`
5. CI builds and packages the VSIX
6. Publish to marketplace: `npx vsce publish`

## Questions?

Open an issue or start a discussion. We're happy to help!
