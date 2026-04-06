# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Context Bridge, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email: security@context-bridge.dev (or open a private security advisory on GitHub).

We will acknowledge your report within 48 hours and provide a timeline for a fix.

## Security Model

### Data Privacy

- **All data is local.** Context Bridge stores all captured context on your local filesystem only.
- **No network requests.** The extension makes zero network calls. No telemetry, no analytics, no remote storage.
- **User-controlled storage.** The store location is configurable and the store file can be inspected, edited, or deleted at any time.

### Secret Redaction

Context Bridge automatically redacts the following patterns from all captured and logged content:

| Pattern | Example |
|---------|---------|
| Password assignments | `password=secret123` |
| API key assignments | `api_key: sk-abc123` |
| Token assignments | `token=eyJhbG...` |
| Bearer tokens | `Bearer eyJhbG...` |
| GitHub PATs | `ghp_aBcDeFg...` |
| OpenAI keys | `sk-abc123...` |
| JWTs | `eyJhbG.eyJzdW.SflKx` |
| PEM private keys | `-----BEGIN PRIVATE KEY-----` |

### Environment Variables

- Only variable **names** are captured (from `.env.example`, `.env.sample`, `.env.template`)
- Variable **values** are never read, stored, or logged
- Actual `.env` files are not processed

### Logging

- All output to the "Context Bridge" output channel passes through the secret redaction filter
- No sensitive data should appear in VS Code's developer tools console

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Best Practices for Users

1. Review the store file periodically: `~/.context-bridge/store.json`
2. Do not add the store file to version control
3. If sharing context, review the exported data for any inadvertently captured sensitive information
4. Use `.env.example` (not `.env`) for environment variable documentation
