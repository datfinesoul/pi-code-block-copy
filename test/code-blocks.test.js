import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCodeBlocks } from "../src/code-blocks.ts";

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

test("parses the Markdown blockquote operator-run example", () => {
  const markdown = [
    "**Legend:** A = Action", "", "**A1 — Next · Operator-run**",
    "> Initialize through each stack’s intended backend and generate whole-stack plans, preferably **PoC first**.",
    ">", "> After initialization, run these checks from the relevant stack directory:", ">",
    "> ```bash", "> tofu fmt -check", "> tofu validate", "> ```", ">",
    "> Production review must confirm no bucket, role, or lock-table replacement/deletion and no trust removal.",
  ].join("\n");
  assert.deepEqual(parseCodeBlocks(markdown), [{
    language: "bash", info: "bash", code: "tofu fmt -check\ntofu validate",
    startLine: 8, endLine: 11, closed: true,
  }]);
  assert.deepEqual(parseCodeBlocks(markdown, { parseQuotedBlocks: false }), []);
});

for (const marker of [">", "│"]) {
  test(`${marker} quotes preserve indentation, blank lines, tabs, and literal markers`, () => {
    const code = ["def check():", "    if ready:", "        validate()  ", "", '\tprint("> and │")', "> literal", "│ literal"];
    const markdown = [marker + " ```python", ...code.map((line) => line ? marker + " " + line : marker), marker + " ```"].join("\n");
    assert.equal(parseCodeBlocks(markdown)[0].code, code.join("\n"));
    assert.deepEqual(parseCodeBlocks(markdown, { parseQuotedBlocks: false }), []);
  });

  test(`${marker} quotes remove only the opening fence indent`, () => {
    const markdown = [marker + "   ```py", marker + "       first()", marker + "         second()", marker + "  x", marker + "   ```"].join("\n");
    assert.equal(parseCodeBlocks(markdown)[0].code, "    first()\n      second()\nx");
  });

  test(`${marker} quotes preserve bare, prefixed, and whitespace-only empty lines`, () => {
    const markdown = [marker + " ```text", marker, marker + " one", marker + " ", marker + "   ", marker + " two", marker, marker + " ```"].join("\n");
    assert.equal(parseCodeBlocks(markdown)[0].code, "\none\n\n  \ntwo\n");
  });

  test(`${marker} quotes stop when the marker changes and continue parsing later blocks`, () => {
    const other = marker === ">" ? "│" : ">";
    const markdown = [marker + " ```sh", marker + " echo first", other + " ```py", other + "     second()", other + " ```"].join("\n");
    assert.deepEqual(parseCodeBlocks(markdown), [
      { language: "sh", info: "sh", code: "echo first", startLine: 1, endLine: 2, closed: false },
      { language: "py", info: "py", code: "    second()", startLine: 3, endLine: 5, closed: true },
    ]);
    const outside = [marker + " ```sh", marker + " echo first", "Outside prose", fence("sh", "echo last")].join("\n");
    assert.deepEqual(parseCodeBlocks(outside).map((block) => block.code), ["echo first", "echo last"]);
  });
}

test("quoted blocks retain normal fence matching rules", () => {
  const markdown = ["│ ~~~~md", "│ ~~~", "│ ```", "│ ~~~~not-a-close", "│ ~~~~~"].join("\n");
  const [block] = parseCodeBlocks(markdown);
  assert.equal(block.code, "~~~\n```\n~~~~not-a-close");
  assert.equal(block.closed, true);
  assert.deepEqual(parseCodeBlocks("│ ```a`b\n│ text"), []);
});

test("quoted and ordinary blocks appear in source order with original line numbers", () => {
  const markdown = [fence("sh", "one"), "│ ```py", "│   two()", "│ ```", fence("js", "three")].join("\r\n");
  const blocks = parseCodeBlocks(markdown);
  assert.deepEqual(blocks.map((block) => block.code), ["one", "  two()", "three"]);
  assert.deepEqual(blocks.map((block) => [block.startLine, block.endLine]), [[1, 3], [4, 6], [7, 9]]);
});

test("unclosed quoted blocks stop before an unquoted fence and revisit the boundary", () => {
  const markdown = ["│ ```py", "│     one()", "```sh", "two", "```"].join("\n");
  const blocks = parseCodeBlocks(markdown);
  assert.equal(blocks.length, 2);
  assert.deepEqual(blocks[0], {
    language: "py", info: "py", code: "    one()", startLine: 1, endLine: 2, closed: false,
  });
  assert.equal(blocks[1].code, "two");
  assert.equal(blocks[1].startLine, 3);
});

test("quoted blocks stop at prose, missing prefixes, or changed quotes", () => {
  for (const boundary of ["Outside prose", "", "│missing space", "┃ changed bar", " │ shifted bar"]) {
    const markdown = ["│ ```sh", "│ echo hi", boundary, "│ not code"].join("\n");
    const [block] = parseCodeBlocks(markdown);
    assert.equal(block.code, "echo hi");
    assert.equal(block.endLine, 2);
    assert.equal(block.closed, false);
  }
});

test("unclosed quoted blocks handle end of input and an immediate quote boundary", () => {
  const [block] = parseCodeBlocks("│ ```py\n│     one()");
  assert.equal(block.code, "    one()");
  assert.equal(block.endLine, 2);
  assert.equal(block.closed, false);
  const [empty] = parseCodeBlocks("│ ```py\nOutside prose");
  assert.equal(empty.code, "");
  assert.equal(empty.endLine, 1);
  assert.equal(empty.closed, false);
});

test("does not recognize other quote styles, nested quotes, or list items in quotes", () => {
  for (const prefix of ["┃ ", "│", "│\t", " │ ", "│ │ ", ">>", "> > ", "> - "]) {
    assert.deepEqual(parseCodeBlocks(fence("sh", "echo hi").split("\n").map((line) => prefix + line).join("\n")), []);
  }
});

test("ordinary blocks preserve literal quote text in their body", () => {
  const code = "│ ```sh\n│     echo hi\n│ ```";
  assert.equal(parseCodeBlocks(["````text", code, "````"].join("\n"))[0].code, code);
});

test("quoted parsing defaults to enabled, and disabling it leaves ordinary blocks intact", () => {
  const plain = fence("sh", "echo ordinary\n> literal quote\n│ literal bar");
  const markdown = [plain, "> ```py", ">     quoted()", "> ```", "│ ```py", "│     barred()", "│ ```"].join("\n");
  const codes = ["echo ordinary\n> literal quote\n│ literal bar", "    quoted()", "    barred()"];
  assert.deepEqual(parseCodeBlocks(markdown).map((block) => block.code), codes);
  assert.deepEqual(parseCodeBlocks(markdown, { parseQuotedBlocks: true }).map((block) => block.code), codes);
  assert.deepEqual(parseCodeBlocks(markdown, { parseQuotedBlocks: false }), parseCodeBlocks(plain));
});

test("an unclosed fence extends to the end and is marked unclosed", () => {
  const blocks = parseCodeBlocks(["```ts", "let a = 1;"].join("\n"));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].closed, false);
  assert.equal(blocks[0].code, "let a = 1;");
});
