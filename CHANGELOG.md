# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-04

### Added

- Initial release of Neiki's Assistant.
- Web Component with Shadow DOM isolation for CSS-conflict-free embedding.
- Floating launcher and responsive chat window with light, dark and auto themes.
- Streaming replies via `text/event-stream` or `text/plain`, plus plain JSON responses.
- Markdown rendering with fenced code blocks, syntax highlighting and copy buttons.
- Conversation history panel — browse, switch between, delete and clear past conversations.
- `localStorage` persistence per conversation and per storage key.
- Typing indicator, retry handling and error states.
- English and Czech localization with an extensible i18n system.
- CSS variable customization and configurable attributes (`title`, `subtitle`, `welcome`, `placeholder`, `accent`, `position`, etc.).
- Keyboard accessible controls (Enter to send, Shift+Enter for newline).
- `minify.py` build script producing a single-file minified JS bundle with embedded CSS.

[1.0.0]: https://github.com/neikiri/neiki-assistant/releases/tag/1.0.0
