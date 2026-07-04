# Security Policy

## Supported Versions

Only the latest published release of Neiki's Assistant receives security fixes.

| Version | Supported |
| --- | --- |
| 1.x | ✅ |
| < 1.0 | ❌ |

## Reporting a Vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

Instead, report it privately by emailing **neikiri@neikiri.dev** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce it, including a minimal example if possible
- The affected version(s)

You should receive an initial response within **72 hours**. We will keep you updated as the issue is investigated and fixed, and will credit you in the release notes unless you prefer to stay anonymous.

## Scope

This policy covers the code in this repository (`src/`, `dist/`, `demo/`, `minify.py`). It does not cover:

- Backends you build to serve the `api` attribute — Neiki's Assistant is a frontend widget and never stores or transmits provider API keys.
- Third-party CDNs or package registries used to distribute the built files.

## Security Design Notes

- The widget never contacts an AI provider directly; it only sends messages to the `api` endpoint you configure.
- Message content is escaped before markdown rendering, and links are restricted to safe URL schemes (`http:`, `https:`, `mailto:`, `tel:`).
- The widget renders inside a Shadow DOM, isolating it from host-page CSS and script interference.
- `localStorage` is used only for conversation persistence on the visitor's own device — no data is sent anywhere by the widget itself.

See [README.md](README.md#-security-notes) for more details on the security model.
