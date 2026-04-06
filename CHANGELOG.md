# Changelog

All notable changes to Context Bridge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-06

### Added

- Initial release of Context Bridge
- **Capture command**: extract context from `.cursor/rules/*.mdc`, `docs/*workflows*.md`, `README.md`, `AGENTS.md`, and `.env.example`
- **Suggest command**: score and rank stored context by relevance to the current repository
- **Apply command**: preview and write imported `.mdc` rules and workflow documentation
- **Validate command**: check `.mdc` frontmatter and workflow doc structure
- **Open Store command**: inspect the global context store
- Context store with JSON schema versioning and migration support (v1 → v2)
- Automatic secret redaction for passwords, tokens, API keys, JWTs, and PEM keys
- Framework detection for Node.js, Python, Go, and Rust ecosystems
- Cross-platform support for macOS, Linux, and Windows
- Idempotent apply with source tags and duplicate detection
- Merge strategy that preserves user content on re-apply
- Configurable settings: store path, max suggestions, minimum confidence, optional captures
- "Context Bridge" output channel for logging
- Comprehensive unit tests for all core modules
- CI/CD with GitHub Actions on ubuntu, macos, and windows
- ESLint + Prettier strict configuration
