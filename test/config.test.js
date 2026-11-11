import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "../src/config.ts";

function load(files = {}, projectTrusted = true) {
  const reads = [];
  const result = loadConfig({
    bundledPath: "/bundled/config.json", agentDir: "/global", cwd: "/project", projectTrusted,
    read(path) {
      reads.push(path);
      if (!(path in files)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      return files[path];
    },
  });
  return { ...result, reads };
}

test("defaults to three with missing files", () => {
  const result = load();
  assert.equal(result.recentMessageLimit, 3);
  assert.equal(result.parseQuotedBlocks, true);
  assert.deepEqual(result.warnings, []);
});

test("layers merge bundled, global, then trusted project", () => {
  const files = {
    "/bundled/config.json": '{"recentMessageLimit":3}',
    "/global/code-block-copy.json": '{"recentMessageLimit":20}',
    "/project/.pi/code-block-copy.json": '{"recentMessageLimit":1}',
  };
  assert.equal(load(files).recentMessageLimit, 1);
  const untrusted = load(files, false);
  assert.equal(untrusted.recentMessageLimit, 20);
  assert.ok(!untrusted.reads.includes("/project/.pi/code-block-copy.json"));
  files["/project/.pi/code-block-copy.json"] = '{}';
  assert.equal(load(files).recentMessageLimit, 20);
});

for (const value of [0, -1, 21, 1.5, "1", null, true, [], {}]) {
  test(`rejects invalid limit ${JSON.stringify(value)} and retains global value`, () => {
    const result = load({
      "/global/code-block-copy.json": '{"recentMessageLimit":5}',
      "/project/.pi/code-block-copy.json": JSON.stringify({ recentMessageLimit: value }),
    });
    assert.equal(result.recentMessageLimit, 5);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /integer from 1 to 20/);
  });
}

for (const text of ['{', 'null', '[]', '1']) {
  test(`invalid JSON configuration ${text} warns and retains defaults`, () => {
    const result = load({ "/global/code-block-copy.json": text });
    assert.equal(result.recentMessageLimit, 3);
    assert.equal(result.warnings.length, 1);
  });
}

test("quoted parsing layers merge independently and honor project trust", () => {
  const files = {
    "/bundled/config.json": '{"recentMessageLimit":3,"parseQuotedBlocks":true}',
    "/global/code-block-copy.json": '{"parseQuotedBlocks":false}',
    "/project/.pi/code-block-copy.json": '{"recentMessageLimit":1}',
  };
  assert.equal(load(files).parseQuotedBlocks, false);
  assert.equal(load(files).recentMessageLimit, 1);
  files["/project/.pi/code-block-copy.json"] = '{"parseQuotedBlocks":true}';
  assert.equal(load(files).parseQuotedBlocks, true);
  assert.equal(load(files, false).parseQuotedBlocks, false);
  files["/global/code-block-copy.json"] = '{}';
  files["/bundled/config.json"] = '{"parseQuotedBlocks":false}';
  assert.equal(load(files, false).parseQuotedBlocks, false);
});

for (const value of [0, 1, "true", "false", null, [], {}]) {
  test(`rejects invalid wrapped setting ${JSON.stringify(value)} without partially applying the layer`, () => {
    const result = load({
      "/global/code-block-copy.json": '{"recentMessageLimit":5,"parseQuotedBlocks":false}',
      "/project/.pi/code-block-copy.json": JSON.stringify({ recentMessageLimit: 1, parseQuotedBlocks: value }),
    });
    assert.equal(result.recentMessageLimit, 5);
    assert.equal(result.parseQuotedBlocks, false);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /parseQuotedBlocks must be a boolean/);
  });
}

test("an invalid limit does not partially apply a valid wrapped setting", () => {
  const result = load({
    "/global/code-block-copy.json": '{"parseQuotedBlocks":false}',
    "/project/.pi/code-block-copy.json": '{"recentMessageLimit":0,"parseQuotedBlocks":true}',
  });
  assert.equal(result.parseQuotedBlocks, false);
  assert.equal(result.recentMessageLimit, 3);
  assert.equal(result.warnings.length, 1);
});

test("read errors warn without crashing", () => {
  const result = loadConfig({ bundledPath: "/bundled", agentDir: "/global", cwd: "/project", projectTrusted: false,
    read() { throw Object.assign(new Error("read failed"), { code: "EIO" }); },
  });
  assert.equal(result.recentMessageLimit, 3);
  assert.equal(result.warnings.length, 2);
});
