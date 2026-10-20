# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-10-20

### Added

- Right/Left arrow expansion of the highlighted block, showing an indentation-preserving preview of up to six source lines with an omitted-line count; the content summary is hidden while expanded and restored on collapse.

### Changed

- Collapsed previews retain combined opening delimiters and show informative content for structural openings, including JSON objects and arrays; structural-only blocks compact to forms such as `[{}]`.
- Line counts retain space when long excerpts are truncated, and displayed content is sanitized against terminal controls.
- Expanded preview lines use a dim vertical gutter and a closing corner to distinguish the section from collapsed rows, without a background fill.

## [0.3.0] - 2026-10-20

### Added

- Number keys 1–9 in the picker toggle the matching blocks, making it easy to select multiple blocks before copying; later blocks show a dot in the shortcut column and remain selectable with navigation and Space.

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

[Unreleased]: https://github.com/datfinesoul/pi-code-block-copy/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/datfinesoul/pi-code-block-copy/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/datfinesoul/pi-code-block-copy/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/datfinesoul/pi-code-block-copy/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/datfinesoul/pi-code-block-copy/releases/tag/v0.1.0
