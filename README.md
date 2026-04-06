# Context Bridge

A VS Code / Cursor extension that captures architecture and business context from one repository and applies relevant context to another — bridging knowledge across your projects.

## What is Context Bridge?

When working across multiple repositories, you often need the same architectural patterns, workflow knowledge, and coding conventions. Context Bridge automates this by:

1. **Capturing** context from a source project (rules, workflows, endpoints, env keys, patterns)
2. **Storing** it in a local, versioned context store
3. **Suggesting** relevant context when you open a different project
4. **Applying** matched context as `.cursor/rules/*.mdc` files and `docs/*-workflows.md` documents

This is especially powerful for teams working with Cursor AI, where `.mdc` rules guide the AI's understanding of your codebase.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       VS Code / Cursor                          │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│  │ Capture  │   │ Suggest  │   │  Apply   │   │  Validate  │  │
│  │ Command  │   │ Command  │   │ Command  │   │  Command   │  │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └─────┬──────┘  │
│       │              │              │               │          │
│  ┌────▼──────────────▼──────────────▼───────────────▼──────┐   │
│  │                    Core Engine                           │   │
│  │  ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐   │   │
│  │  │ Extractor │ │ Matcher │ │ Applier │ │ Validator │   │   │
│  │  └───────────┘ └─────────┘ └─────────┘ └───────────┘   │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                       │
│  ┌─────────────────────▼───────────────────────────────────┐   │
│  │              Storage Layer                               │   │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │  Context Store  │  │  Schema Migrations            │  │   │
│  │  │  (store.json)   │  │  (v1 → v2 → ...)             │  │   │
│  │  └─────────────────┘  └──────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Utilities                                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │ Redactor │  │ Platform │  │    FS    │  │ Logger │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  ~/.context-bridge │
                    │    store.json      │
                    └───────────────────┘
```

## Features

### Commands (Command Palette)

| Command | Description |
|---------|-------------|
| `Context Bridge: Capture Current Project Context` | Scan and store context from the current workspace |
| `Context Bridge: Suggest Context For This Repository` | Find relevant stored context for the current project |
| `Context Bridge: Apply Suggested Context` | Preview and write imported context files |
| `Context Bridge: Open Context Store` | Open the global store.json for inspection |
| `Context Bridge: Validate Context Files` | Check .mdc and workflow docs for correctness |

### What Gets Captured

- `.cursor/rules/**/*.mdc` — Cursor AI rules with frontmatter
- `docs/**/*workflows*.md` — Business workflow documentation
- `README.md` — Project overview (optional)
- `AGENTS.md` — Agent instructions (optional)
- `.env.example` / `.env.sample` — Environment variable key names (values redacted)
- Framework and language detection from `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`

### Context Matching

Relevance scoring uses five signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| Keyword overlap | 25% | Shared terms between projects |
| File signature | 20% | Common file names and patterns |
| Framework match | 25% | Shared frameworks (Express, React, etc.) |
| Endpoint similarity | 15% | Matching API route segments |
| Workflow similarity | 15% | Overlapping workflow terms |

### Apply & Merge

- Preview changes before writing
- Never overwrites existing user content silently
- Appends imported sections with source tags and timestamps
- Idempotent: re-applying the same source replaces the previous import
- Generated files:
  - `.cursor/rules/context-bridge-imported.mdc`
  - `docs/context-bridge-imported-workflows.md`

## Installation

### From VSIX (Local)

```bash
# Build the package
npm run compile
npx vsce package

# Install in VS Code
code --install-extension context-bridge-0.1.0.vsix

# Install in Cursor
cursor --install-extension context-bridge-0.1.0.vsix
```

### From Marketplace

*(Coming soon — see Publishing section below)*

### Development Install

```bash
git clone https://github.com/your-org/context-bridge.git
cd context-bridge
npm install
npm run compile
```

Then press `F5` in VS Code/Cursor to launch the Extension Development Host.

## Local Development

### Prerequisites

- Node.js 20+ (LTS)
- npm 9+
- VS Code 1.85+ or Cursor

### Setup

```bash
npm install
```

### Build

```bash
npm run compile        # One-time compile
npm run watch          # Watch mode for development
```

### Run Tests

```bash
npm test               # Compile + run all tests
```

### Lint

```bash
npm run lint           # Check for lint errors
npm run lint:fix       # Auto-fix lint errors
npm run format         # Format with Prettier
npm run format:check   # Check formatting
```

### Debug

1. Open this project in VS Code/Cursor
2. Press `F5` to launch the Extension Development Host
3. Use the Command Palette in the new window to run Context Bridge commands
4. Check the "Context Bridge" output channel for logs

## Configuration

Add these to your VS Code/Cursor `settings.json`:

```jsonc
{
  // Custom path for the context store (default: ~/.context-bridge/store.json)
  "contextBridge.storePath": "",

  // Maximum suggestions to show (1-20, default: 5)
  "contextBridge.maxSuggestions": 5,

  // Minimum confidence score for suggestions (0-1, default: 0.3)
  "contextBridge.minimumConfidence": 0.3,

  // Include README.md when capturing context (default: true)
  "contextBridge.captureReadme": true,

  // Include AGENTS.md when capturing context (default: true)
  "contextBridge.captureAgentsMd": true,

  // Auto-validate after applying context (default: true)
  "contextBridge.autoValidate": true
}
```

## Cross-Platform Notes

Context Bridge is designed to work on macOS, Linux, and Windows:

- All file paths use Node.js `path` module for cross-platform compatibility
- Path separators are normalized to forward slashes in stored data
- Default store location:
  - **macOS/Linux:** `~/.context-bridge/store.json`
  - **Windows:** `%USERPROFILE%\.context-bridge\store.json`
- Line endings are handled for both LF and CRLF
- No shell-specific commands are used
- CI runs on all three platforms

## Security & Privacy

### Secret Redaction

Context Bridge **never** stores secret values:

- Passwords, tokens, API keys, and private keys are automatically redacted
- Environment variable **values** are never captured — only key names from `.env.example` / `.env.sample`
- All log output passes through a redaction filter
- Recognized patterns: `password=`, `token:`, `api_key:`, `Bearer`, GitHub tokens (`ghp_`), JWTs, PEM keys

### Data Storage

- All context is stored **locally** on your machine
- No data is sent to any remote server
- The store is a plain JSON file you can inspect, edit, or delete at any time
- Store location is configurable

## Example Workflow

### 1. Capture context from Project A

```
Open Project A in VS Code/Cursor
Cmd+Shift+P → "Context Bridge: Capture Current Project Context"
→ "Context captured for 'project-a': 3 rules, 2 workflows, 5 endpoints, 4 env keys"
```

### 2. Switch to Project B and get suggestions

```
Open Project B in VS Code/Cursor
Cmd+Shift+P → "Context Bridge: Suggest Context For This Repository"
→ Shows: "project-a (72% match) - Framework match: 100% | Keyword overlap: 45%"
```

### 3. Apply selected context

```
Select "project-a" from suggestions → Click "Apply"
→ Preview shows the imported .mdc and workflow docs
→ Confirm → Files written:
  - .cursor/rules/context-bridge-imported.mdc
  - docs/context-bridge-imported-workflows.md
```

### 4. Validate

```
Cmd+Shift+P → "Context Bridge: Validate Context Files"
→ "All context files are valid."
```

## Troubleshooting

### Extension not activating
- Ensure VS Code 1.85+ or latest Cursor
- Check the "Context Bridge" output channel for errors

### No suggestions found
- Capture at least one other project first
- Lower `contextBridge.minimumConfidence` in settings
- Ensure projects share some frameworks, keywords, or patterns

### Store file issues
- Run "Context Bridge: Open Context Store" to inspect
- Delete `~/.context-bridge/store.json` to reset (data will be recreated)
- Check file permissions

### Validation errors
- MDC files need frontmatter with `description` and either `alwaysApply` or `globs`
- Workflow docs should have at least a top-level heading

### Cross-platform path issues
- Store paths use OS-native separators
- Stored data uses normalized forward slashes

## Release & Publishing

### Build VSIX

```bash
npm run compile
npx vsce package
```

### Install Locally

```bash
code --install-extension context-bridge-*.vsix
```

### Publish to Marketplace

```bash
# First time: create a publisher at https://marketplace.visualstudio.com/manage
npx vsce login <publisher-name>
npx vsce publish
```

### Publish to Open VSX (for Cursor/other editors)

```bash
npx ovsx publish context-bridge-*.vsix -p <token>
```

## FAQ

**Q: Does this send any data to the internet?**
A: No. All data stays on your local machine.

**Q: Can I use this with Cursor?**
A: Yes. Context Bridge is a standard VS Code extension that works in Cursor.

**Q: What if I re-capture a project?**
A: The existing entry is merged — new data is added, duplicates are removed, timestamps are updated.

**Q: What if I re-apply the same context?**
A: The import is idempotent. The previous import section is replaced, not duplicated.

**Q: Can I edit the imported files?**
A: Yes. User content outside the import markers is preserved on re-apply.

**Q: How do I remove imported context?**
A: Delete the generated files, or remove the import sections between the markers.

**Q: What file formats are supported?**
A: `.mdc` (Cursor rules with YAML frontmatter) and `.md` (Markdown workflow docs).

## License

[MIT](LICENSE)
