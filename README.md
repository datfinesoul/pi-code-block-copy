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

Installation scope and [configuration layers](#configuration) are independent. Both installation types read global settings and trusted project settings.

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
- Previews retain opening delimiters such as `{` and `[{` and show up to two informative lines when a block starts with structural-only lines. `↵` separates source lines, and `…` marks omitted content. Structural-only blocks compact to forms such as `[{}]`; ordinary code keeps its first-line preview.
- Press <kbd>Right</kbd> to expand the highlighted block and <kbd>Left</kbd> to collapse it. Expansion marks preview lines with a dim vertical gutter, hides that row's content summary until collapsed, preserves indentation (tabs display as four spaces), shows up to six source lines with an omitted-line count, and shrinks on short terminals. Moving or switching recent/all history collapses the preview. Copied code is unchanged.
- The picker uses <kbd>○</kbd> for unselected blocks and <kbd>●</kbd> for selected blocks. Its number column shows digits 1–9 when shortcuts are available and <kbd>·</kbd> otherwise.
- Blocks with <kbd>·</kbd> in the number column remain selectable with <kbd>Up</kbd>/<kbd>Down</kbd> and <kbd>Space</kbd>. Press <kbd>Tab</kbd> to switch between the recent view and all history; the first nine blocks keep the same shortcut digits when you switch.
- Run `/cbc all` to open the picker in all-history mode, even when only one block exists. Press <kbd>Tab</kbd> to switch to the recent view.
- Run `/cbc <n>` to copy block `n` from the recent view without opening the picker.
- Press <kbd>Ctrl</kbd>+<kbd>\`</kbd> to run the same copy flow without typing the command.
- When the recent view contains exactly one block, `/cbc` copies it immediately. The notification shows `/cbc all` as the command to browse all blocks.
- Copied blocks are raw code: no fences, no trailing newline, and no indentation that existed only to nest the fence in a list. Selecting several blocks joins them with a blank line.
- By default, CBC includes fenced blocks inside Markdown blockquotes with the exact `> ` prefix. It also supports the literal `│ ` prefix. CBC removes the opening fence's prefix from each code line and applies its usual fence-indent removal. Other code indentation, tabs, and literal markers remain unchanged. A bare `>` or `│` represents an empty line in its matching quote. If the prefix ends or changes before the closing fence, the block stops there. Nested quotes and other prefix formats are not supported.

## Configuration

Settings merge from lowest to highest priority:

| Layer | Location |
|---|---|
| Bundled | `extensions/code-block-copy/config.json` |
| Global | `~/.pi/agent/code-block-copy.json` (follows `PI_CODING_AGENT_DIR`) |
| Project | `<project>/.pi/code-block-copy.json`, only when Pi trusts the project |

Higher-priority settings replace lower-priority values for each field. Missing fields retain the lower-priority value. An invalid value or file produces a warning and leaves that entire configuration layer unapplied. The extension reads these settings each time you use `/cbc` or the shortcut.

### Change the recent view

Add this setting to the global or project file:

```json
{
  "recentMessageLimit": 1
}
```

This setting includes only the latest assistant message with non-empty code blocks. If that message contains exactly one block, `/cbc` and the shortcut copy it immediately. If it contains multiple blocks, the picker opens. Use `/cbc all` to browse all history without quick copy. Press <kbd>Tab</kbd> in the picker to switch between recent messages and all history.

### Disable quoted blocks

Add this setting to the global or trusted project file:

```json
{
  "parseQuotedBlocks": false
}
```

The default is `true`. Set the field to `false` to ignore blocks with the `> ` or `│ ` prefix. Ordinary fenced blocks remain unchanged. The setting applies to recent history, all history, direct block selection, and the keyboard shortcut. Disabled blocks do not receive numbers or count toward the recent-message limit. Changes apply on the next invocation without `/reload`.

### Field reference

| Field | Default | Accepted values | Meaning |
|---|---|---|---|
| `recentMessageLimit` | `3` | Integers from `1` to `20` | Number of recent assistant messages with non-empty code blocks to include |
| `parseQuotedBlocks` | `true` | Booleans `true` or `false` | Include fenced code blocks with the exact `> ` or `│ ` prefix |

Zero, negative numbers, fractions, and values above 20 are invalid. The limit counts messages, not individual blocks.

## Keyboard shortcut

The shortcut is <kbd>Ctrl</kbd>+<kbd>\`</kbd>. It behaves like `/cbc` with no argument: it copies the only block immediately when the recent view has one, and otherwise opens the picker. `/cbc <n>` remains the fast path for copying a specific block by number.

Some terminals do not send <kbd>Ctrl</kbd>+<kbd>\`</kbd> distinctly from a plain backtick, in which case use `/cbc` instead.

## How it works

The extension reads the current session branch and parses fenced code blocks from finalized assistant messages, supporting both backtick and tilde fences. It copies through Pi's own clipboard support, so it follows the same platform behavior and error messages as `/copy`. It does not modify the session, the transcript, or the model context, and it does not send anything to the model. Copied text is not executed or inspected. This extension is a convenience, not a security boundary; see [SECURITY.md](SECURITY.md).

## Development

The package requires no runtime dependencies beyond the Pi host. Runtime helpers use `.ts` files without a build step so `/reload` can refresh imported logic. Node.js imports these helpers directly in unit tests. The scripts work with npm or pnpm. Run the test suite and inspect the publishable package with:

```sh
npm test
npm run pack:check
```

Use `pnpm test` and `pnpm run pack:check` when you use pnpm.

Each feature branch that triggers CI gets one version update relative to its base. Keep that version unchanged throughout the branch. Record subsequent user-visible changes under the same matching `## [<version>] - <date>` changelog heading. Do not increment the patch version for each edit, fix, or conversation turn. CI requires the branch version to exceed its base version. Pull requests that change only Markdown skipped by CI are exempt. After merge and successful CI, the Release workflow tags the tested commit `v<version>`. Merges that do not change the version are not tagged.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

[MIT](LICENSE) © Philip Hadviger
