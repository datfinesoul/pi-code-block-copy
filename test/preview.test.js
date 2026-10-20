import assert from "node:assert/strict";
import { test } from "node:test";
import { compactPreview, expandedPreview, safeDisplay } from "../src/preview.js";

test("object excerpts retain opening shape and two informative lines", () => {
  assert.equal(compactPreview('{\n  "name": "demo",\n  "enabled": true\n}'), '{ … "name": "demo", ↵ "enabled": true …');
});

test("mixed openings combine across lines and whitespace", () => {
  for (const opening of ["[{", "[ {", "[\n  {", "\n[\n\n  {"]) {
    assert.equal(compactPreview(`${opening}\n  "type": "message"\n}]`), '[{ … "type": "message" …');
  }
  assert.equal(compactPreview('({\n  enabled: true\n})'), '({ … enabled: true …');
});

test("structural-only blocks compact without claiming omitted content", () => {
  assert.equal(compactPreview('[\n  {\n}\n]'), '[{}]');
  assert.equal(compactPreview('{\n}'), '{}');
  assert.equal(compactPreview('[\n[\n[]\n]\n]'), '[[[]]]');
  assert.equal(compactPreview('((\n))'), '(())');
  assert.equal(compactPreview('{}'), '{}');
});

test("ordinary code and punctuation are not discarded", () => {
  for (const line of ['const enabled = true;', '# comment', '---', '{};', 'return {', 'x', '...']) {
    assert.equal(compactPreview(`\n${line}\nnext`), line);
  }
  assert.equal(compactPreview(' \n\t'), '');
});

test("expanded previews preserve indentation and bound height", () => {
  const code = '{\n  "name": "demo",\n  "enabled": true\n}';
  assert.deepEqual(expandedPreview(code, 7), code.split('\n').map(line => `      ${line}`));
  assert.deepEqual(expandedPreview(code, 2), ['      {', '      … 3 more lines']);
  assert.deepEqual(expandedPreview(code, 1), ['      … 4 more lines']);
  assert.deepEqual(expandedPreview(code, 0), []);
  const long = Array.from({length: 18}, (_, i) => String(i)).join('\n');
  assert.equal(expandedPreview(long, 20).length, 7);
  assert.equal(expandedPreview(long, 20).at(-1), '      … 12 more lines');
  assert.equal(expandedPreview('\tvalue', 2)[0], '          value');
});

test("terminal escapes and controls cannot inject display rows or styles", () => {
  assert.equal(safeDisplay('\x1b[31mred\x1b[0m\r\x07\x9b'), 'red');
  assert.equal(safeDisplay('\x1b]8;;https://example.com\x07link\x1b]8;;\x1b\\'), 'link');
  assert.equal(compactPreview('\x1b[31m{\x1b[0m\n  value\n}'), '{ … value …');
  assert.deepEqual(expandedPreview('a\rb\x1b[2J', 2), ['      ab']);
});
