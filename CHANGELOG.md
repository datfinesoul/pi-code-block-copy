# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-16

### Added

- `Ctrl` + backtick shortcut to open the code block picker without typing `/cbc`.

### Changed

- Merges to `main` that bump the version are tagged `v<version>` automatically after CI passes, and pull requests that trigger CI must bump the version with a matching changelog section.

## [0.1.0] - 2026-10-12

### Added

- Initial standalone Pi package.
- `/cbc` picker for copying one or more fenced code blocks from the most recent assistant messages that contain any.
- `/cbc <n>` to copy a specific block directly, and immediate copy when only one block is available.
- Recent-view and all-history scopes, switched with `Tab`.
- Fenced code block parser supporting backtick and tilde fences and dedenting content nested in lists.
- Automated tests and open source project documentation.

[Unreleased]: https://github.com/datfinesoul/pi-code-block-copy/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/datfinesoul/pi-code-block-copy/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/datfinesoul/pi-code-block-copy/releases/tag/v0.1.0
