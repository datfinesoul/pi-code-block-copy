import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const entry = process.env.PI_CODING_AGENT_ENTRY;

test("installed Pi picker: expansion, sizing, navigation, selection and copy payload", { skip: !entry && 'Set PI_CODING_AGENT_ENTRY to installed Pi dist/index.js' }, async () => {
  const require = createRequire(entry);
  const { createJiti } = await import(require.resolve('jiti'));
  const tuiPath = require.resolve('@earendil-works/pi-tui');
  const jiti = createJiti(import.meta.url, { alias: {
    '@earendil-works/pi-coding-agent': entry,
    '@earendil-works/pi-tui': tuiPath,
  } });
  const { visibleWidth } = await import(tuiPath);
  const { default: extension } = await jiti.import('../extensions/code-block-copy/index.ts');
  let command;
  extension({ registerShortcut() {}, registerCommand(_name, value) { command = value; } });
  const code = '{\n  "name": "demo",\n  "enabled": true\n}';
  const long = Array.from({length: 18}, (_, i) => `line ${i}`).join('\n');
  const text = ['```json', code, '```', '```text', long, '```', '```json', '[\n  {\n}\n]', '```'].join('\n');
  await command.handler('', {
    mode: 'tui',
    sessionManager: { getBranch: () => [{ type: 'message', message: { role: 'assistant', content: [{type: 'text', text}] } }] },
    ui: {
      notify() { assert.fail('Unexpected notification'); },
      async custom(factory) {
        const tui = {terminal: {rows: 24}, requestRender() {}};
        const theme = {fg: (_color, value) => value, bold: value => value};
        let chosen;
        const picker = factory(tui, theme, {}, value => { chosen = value; });
        const render = (width = 100) => {
          const rows = picker.render(width);
          assert.ok(rows.every(line => visibleWidth(line) <= width));
          assert.ok(rows.length <= tui.terminal.rows);
          return rows.join('\n');
        };
        assert.match(render(), /json · \{ … "name": "demo", ↵ "enabled": true … \(4 lines\)/);
        assert.match(render(), /\[\{\}\] \(4 lines\)/);
        picker.handleInput('\x1b[C');
        assert.match(render(), /\n        "name": "demo",/);
        assert.match(render(), /> ○ 1 json\s+\(4 lines\)/);
        assert.doesNotMatch(render(), /json · \{ …/);
        assert.match(render(), /\[\{\}\] \(4 lines\)/);
        picker.handleInput('1');
        assert.match(render(), /● 1/);
        picker.handleInput('\x1b[D');
        assert.doesNotMatch(render(), /\n        "name":/);
        assert.match(render(), /json · \{ … "name": "demo",/);
        picker.handleInput('\x1b[C');
        picker.handleInput('\x1b[B');
        assert.doesNotMatch(render(), /\n        "name":/);
        picker.handleInput('\x1b[C');
        assert.match(render(), /12 more lines/);
        for (const height of [12, 16, 24, 40]) {
          tui.terminal.rows = height;
          for (const width of [20, 40, 80, 120]) render(width);
        }
        tui.terminal.rows = 24;
        assert.match(render(40), /\(18 lines\)/);
        picker.handleInput('\t');
        assert.doesNotMatch(render(), /more lines/);
        picker.handleInput('3');
        picker.handleInput('\r');
        assert.deepEqual(chosen.map(item => item.code), [code, '[\n  {\n}\n]']);
        // Exercise selection through the real component without writing to the host clipboard.
        return null;
      },
    },
  });
});
