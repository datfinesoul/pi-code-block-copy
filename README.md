# pi-code-block-copy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A standalone [Pi](https://github.com/earendil-works/pi) extension that copies individual fenced code blocks from recent assistant messages to the system clipboard. Run `/cbc`, choose the block or blocks you want, and Pi puts the raw code on your clipboard without the surrounding fences.

## Installation

### Global installation

Install from GitHub for use in every project. Pi records the package in `~/.pi/agent/settings.json`:

```sh
pi install git:github.com/datfinesoul/pi-code-block-copy
```

### Project installation

From the target project directory, add `--local` (or `-l`) to record the package in `.pi/settings.json` for that project only:

```sh
pi install --local git:github.com/datfinesoul/pi-code-block-copy
```

Project packages load only after Pi grants project trust. Run `/reload` in an existing Pi session or start a new session after either type of installation.

> [!NOTE]
> Pi identifies a package by where it was installed from. Installing pi-code-block-copy globally and for a project from the same source is fine: the project installation replaces the global one. Installing it from different locations, such as GitHub globally and a local checkout for a project, loads both copies, and Pi does not reconcile them.

<details>
<summary>Install from a local checkout</summary>

Install a local checkout globally:

```sh
pi install /path/to/pi-code-block-copy
```

Or for the current project only:

```sh
pi install --local /path/to/pi-code-block-copy
```

To try the extension from a checkout without adding it to Pi's settings:

```sh
pi --no-extensions --extension ./extensions/code-block-copy/index.ts
```

> If this package replaces a manually installed `~/.pi/agent/extensions/code-block-copy` directory, remove or relocate the old copy after installing the package so Pi does not load both copies.

</details>

## Usage

- Run `/cbc` to open the code block picker. It lists the code blocks from the most recent assistant messages that contain any, three messages back by default.
- Use <kbd>Up</kbd>/<kbd>Down</kbd> to navigate, <kbd>Space</kbd> to toggle the highlighted block, or <kbd>1</kbd>–<kbd>9</kbd> to toggle the correspondingly numbered block. Press <kbd>Enter</kbd> to copy checked blocks and <kbd>Esc</kbd> to cancel.
- Number keys match the labels in the current view; use <kbd>Up</kbd>/<kbd>Down</kbd> and <kbd>Space</kbd> to select blocks numbered 10 and higher.
- Press <kbd>Tab</kbd> to switch between the recent view and all history. The recent view is always the newest part of the full list, so a block's number does not change when you switch.
- Run `/cbc <n>` to copy block `n` from the recent view without opening the picker.
- Press <kbd>Ctrl</kbd>+<kbd>\`</kbd> to run the same copy flow without typing the command.
- When the recent view contains exactly one block, `/cbc` copies it immediately.
- Copied blocks are raw code: no fences, no trailing newline, and no indentation that existed only to nest the fence in a list. Selecting several blocks joins them with a blank line.

## Keyboard shortcut

The shortcut is <kbd>Ctrl</kbd>+<kbd>\`</kbd>. It behaves like `/cbc` with no argument: it copies the only block immediately when the recent view has one, and otherwise opens the picker. `/cbc <n>` remains the fast path for copying a specific block by number.

Some terminals do not send <kbd>Ctrl</kbd>+<kbd>\`</kbd> distinctly from a plain backtick, in which case use `/cbc` instead.

## How it works

The extension reads the current session branch and parses fenced code blocks from finalized assistant messages, supporting both backtick and tilde fences. It copies through Pi's own clipboard support, so it follows the same platform behavior and error messages as `/copy`. It does not modify the session, the transcript, or the model context, and it does not send anything to the model. Copied text is not executed or inspected. This extension is a convenience, not a security boundary; see [SECURITY.md](SECURITY.md).

## Development

The package requires no runtime dependencies beyond the Pi host. The scripts work with npm or pnpm. Run the test suite and inspect the publishable package with:

```sh
npm test
npm run pack:check
```

Use `pnpm test` and `pnpm run pack:check` when you use pnpm.

Every pull request that triggers CI must bump `version` in `package.json` and move the `Unreleased` changelog entries under a matching `## [<version>] - <date>` heading; CI fails otherwise. Pull requests that change only Markdown skipped by CI are exempt. After the merge to `main` passes CI, the Release workflow tags that commit `v<version>`. Merges that do not change the version are not tagged.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

[MIT](LICENSE) © Philip Hadviger
