import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const entry = process.env.PI_CODING_AGENT_ENTRY;

test("configured command and shortcut: scopes, labels, quick copy, and validation", { skip: !entry && "Set PI_CODING_AGENT_ENTRY to installed Pi dist/index.js" }, async () => {
  const root = mkdtempSync(join(tmpdir(), "cbc-config-"));
  try {
    const require = createRequire(entry);
    const { createJiti } = await import(require.resolve("jiti"));
    const stub = join(root, "host.mjs");
    writeFileSync(stub, `export const CONFIG_DIR_NAME = '.pi';
export const getAgentDir = () => ${JSON.stringify(root)};
export const copied = [];
export const copyToClipboard = async text => { copied.push(text); };
`);
    const jiti = createJiti(import.meta.url, { alias: {
      "@earendil-works/pi-coding-agent": stub,
      "@earendil-works/pi-tui": require.resolve("@earendil-works/pi-tui"),
    } });
    const { default: extension } = await jiti.import("../extensions/code-block-copy/index.ts");
    const host = await jiti.import(stub);
    let command, shortcut;
    extension({ registerCommand(_name, value) { command = value; }, registerShortcut(_key, value) { shortcut = value; } });
    mkdirSync(join(root, ".pi"));
    const configPath = join(root, ".pi/code-block-copy.json");
    const setLimit = value => writeFileSync(configPath, JSON.stringify({ recentMessageLimit: value }));
    const message = text => ({ type: "message", message: { role: "assistant", content: [{ type: "text", text }] } });
    let branch = [message("```\nolder\n```"), message("no code"), message("```\nlatest\n```")];
    let opened = 0;
    let expectedLimit = 1;
    let expectedAll = false;
    const notifications = [];
    const ctx = {
      mode: "tui", cwd: root, isProjectTrusted: () => true,
      sessionManager: { getBranch: () => branch },
      ui: {
        notify(text, level) { notifications.push({ text, level }); },
        async custom(factory) {
          opened++;
          const picker = factory({ terminal: { rows: 80 }, requestRender() {} }, { fg: (_c, text) => text, bold: text => text }, {}, () => {});
          const render = () => picker.render(160).join("\n");
          if (expectedAll) {
            assert.match(render(), /all history/);
            assert.match(render(), /latest/);
            picker.handleInput("\t");
          }
          assert.match(render(), new RegExp(`last ${expectedLimit} ${expectedLimit === 1 ? "message" : "messages"} with code`));
          if (expectedLimit === 1) assert.doesNotMatch(render(), /older/);
          picker.handleInput("\t");
          assert.match(render(), /all history/);
          assert.match(render(), /older/);
          return null;
        },
      },
    };
    setLimit(1);
    await command.handler("", ctx);
    await shortcut.handler(ctx);
    assert.deepEqual(host.copied, ["latest", "latest"]);
    assert.equal(opened, 0);
    assert.match(notifications.at(-1).text, /"\/cbc all" to browse all blocks/);
    expectedAll = true;
    await command.handler(" all ", ctx);
    assert.equal(opened, 1);
    assert.deepEqual(host.copied, ["latest", "latest"]);
    // Even a single block in the entire history must open the all-history picker.
    const history = branch;
    branch = [message("```\nlatest\n```")];
    const originalCustom = ctx.ui.custom;
    ctx.ui.custom = async factory => {
      const picker = factory({ terminal: { rows: 24 }, requestRender() {} }, { fg: (_c, text) => text, bold: text => text }, {}, () => {});
      assert.match(picker.render(160).join("\n"), /all history/);
      return null;
    };
    await command.handler("all", ctx);
    assert.deepEqual(host.copied, ["latest", "latest"]);
    branch = [];
    await command.handler("all", ctx);
    assert.match(notifications.at(-1).text, /No code blocks/);
    branch = history;
    ctx.ui.custom = originalCustom;
    expectedAll = false;
    branch.push(message("```\none\n```\n```\ntwo\n```"));
    await command.handler("", ctx);
    assert.equal(opened, 2);
    await command.handler("3", ctx);
    assert.match(notifications.at(-1).text, /No code block 3/);
    setLimit(20);
    expectedLimit = 20;
    await command.handler("", ctx);
    setLimit(0);
    expectedLimit = 3;
    await command.handler("", ctx);
    assert.ok(notifications.some(item => item.level === "warning" && /integer from 1 to 20/.test(item.text)));
    ctx.isProjectTrusted = () => false;
    await command.handler("", ctx);

    // Re-read the toggle on each invocation, before numbering or counting messages.
    ctx.isProjectTrusted = () => true;
    const wrapped = "> ```py\n>     wrapped()\n> ```";
    const ordinary = "```sh\n  ordinary\n```";
    const setWrapped = value => writeFileSync(configPath, JSON.stringify({ recentMessageLimit: 1, parseQuotedBlocks: value }));
    branch = [message("```\nolder\n```"), message(wrapped)];
    setWrapped(false);
    await command.handler("", ctx);
    assert.equal(host.copied.at(-1), "older");
    await shortcut.handler(ctx);
    assert.equal(host.copied.at(-1), "older");
    setWrapped(true);
    await command.handler("", ctx);
    assert.equal(host.copied.at(-1), "    wrapped()");

    branch = [message("```\nolder\n```"), message([wrapped, ordinary].join("\n"))];
    setWrapped(false);
    await command.handler("1", ctx);
    assert.equal(host.copied.at(-1), "  ordinary");
    await command.handler("2", ctx);
    assert.match(notifications.at(-1).text, /No code block 2/);
    ctx.ui.custom = async factory => {
      const picker = factory({ terminal: { rows: 80 }, requestRender() {} }, { fg: (_c, text) => text, bold: text => text }, {}, () => {});
      const render = () => picker.render(160).join("\n");
      assert.match(render(), /all history/);
      assert.match(render(), /1 sh\s+· ordinary/);
      assert.match(render(), /2 code\s+· older/);
      assert.doesNotMatch(render(), /wrapped\(\)/);
      picker.handleInput("\t");
      assert.doesNotMatch(render(), /older|wrapped\(\)/);
      return null;
    };
    await command.handler("all", ctx);
    setWrapped(true);
    await command.handler("1", ctx);
    assert.equal(host.copied.at(-1), "    wrapped()");
    await command.handler("2", ctx);
    assert.equal(host.copied.at(-1), "  ordinary");
    ctx.ui.custom = async factory => {
      const picker = factory({ terminal: { rows: 80 }, requestRender() {} }, { fg: (_c, text) => text, bold: text => text }, {}, () => {});
      assert.match(picker.render(160).join("\n"), /wrapped\(\)/);
      return null;
    };
    await shortcut.handler(ctx);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
