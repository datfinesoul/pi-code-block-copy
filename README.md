# pi-code-block-copy

A Pi extension for copying individual fenced code blocks from recent assistant messages into the system clipboard.

> [!NOTE]
> This is an experimental MVP. It works, but it does not yet follow the shared module conventions.

## Usage

- `/cbs` — list the code blocks from the most recent assistant messages that contain any (three by default) and copy the selected ones. `Space` toggles a block, `Tab` switches between the recent view and all history, `Enter` copies, `Esc` cancels.
- `/cbs <n>` — copy block `n` from the recent view directly, without opening the picker.
- When the recent view contains a single block, `/cbs` copies it immediately.

Copied blocks are raw code with no fences and no trailing newline. Multiple selected blocks are joined with a blank line.

## Development

```sh
npm test
```

The extension entry point is `extensions/code-block-copy/index.ts`; the fenced-block parser lives in `src/code-blocks.js` and is covered by `test/code-blocks.test.js`.

## License

[MIT](LICENSE)
