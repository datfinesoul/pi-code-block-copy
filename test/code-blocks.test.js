import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCodeBlocks } from "../src/code-blocks.js";

const fence = (language, code) => ["```" + language, code, "```"].join("\n");

test("parses a backtick block with a language", () => {
  const blocks = parseCodeBlocks(fence("ts", "const x = 1;"));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].language, "ts");
  assert.equal(blocks[0].info, "ts");
  assert.equal(blocks[0].code, "const x = 1;");
  assert.equal(blocks[0].closed, true);
});

test("parses a block without a language", () => {
  const blocks = parseCodeBlocks(fence("", "plain text"));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].language, "");
  assert.equal(blocks[0].code, "plain text");
});

test("keeps interior blank lines but drops the newline before the closing fence", () => {
  const blocks = parseCodeBlocks(fence("js", "a\n\nb"));
  assert.equal(blocks[0].code, "a\n\nb");
});

test("supports tilde fences", () => {
  const blocks = parseCodeBlocks(["~~~py", "print(1)", "~~~"].join("\n"));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].language, "py");
  assert.equal(blocks[0].code, "print(1)");
});

test("ignores inline code spans", () => {
  assert.deepEqual(parseCodeBlocks("Use `npm test` to run."), []);
});

test("handles a fence nested in a list and strips the list indent", () => {
  const markdown = ["- item", "", "  ```sh", "  echo hi", "  ```"].join("\n");
  const blocks = parseCodeBlocks(markdown);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].code, "echo hi");
});

test("matches a longer closing fence and nested shorter fences", () => {
  const markdown = ["````md", "```ts", "const x = 1;", "```", "````"].join("\n");
  const blocks = parseCodeBlocks(markdown);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].language, "md");
  assert.equal(blocks[0].code, "```ts\nconst x = 1;\n```");
});

test("does not open a backtick fence whose info string contains a backtick", () => {
  assert.deepEqual(parseCodeBlocks("```a`b\nplain text"), []);
});

test("parses every block in order", () => {
  const markdown = [fence("ts", "one"), "text", fence("sh", "two")].join("\n");
  const blocks = parseCodeBlocks(markdown);
  assert.equal(blocks.length, 2);
  assert.deepEqual(
    blocks.map((block) => block.language),
    ["ts", "sh"],
  );
});

test("an unclosed fence extends to the end and is marked unclosed", () => {
  const blocks = parseCodeBlocks(["```ts", "let a = 1;"].join("\n"));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].closed, false);
  assert.equal(blocks[0].code, "let a = 1;");
});
