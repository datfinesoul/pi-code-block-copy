/**
 * Code Block Copy: copy individual fenced code blocks from recent assistant messages.
 *
 * `/cbc` lists the code blocks from the most recent assistant messages that
 * contain any (three by default; Tab switches to all history) and copies the
 * selected blocks to the clipboard. `/cbc <n>` copies block n directly.
 */

import { copyToClipboard } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { parseCodeBlocks } from "../../src/code-blocks.js";
import { toggleNumberedSelection } from "../../src/selection.js";

/** How many code-bearing assistant messages the default view reaches back. */
const RECENT_MESSAGE_LIMIT = 3;
const NUMBERED_SELECTION_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Show the digit shortcut or a dot when the item has no number shortcut. */
function numberedItemIndicator(index: number): string {
  return Number.isInteger(index) && index >= 1 && index <= 9 ? String(index) : "·";
}

interface Item {
  /** 1-based position in the full newest-first list; the recent view is a prefix of the full list. */
  index: number;
  /** 1 for the newest assistant message that contains a code block. */
  groupRank: number;
  language: string;
  code: string;
  lineCount: number;
  firstLine: string;
}

/** Remove terminal control sequences before rendering text from the model. */
function safeDisplay(value: string): string {
  return value
    .replace(/\x1B(?:[@-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** Text of every finalized assistant message on the current branch, oldest first. */
function assistantTexts(ctx: ExtensionContext): string[] {
  const texts: string[] = [];
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type !== "message") continue;
    const message = entry.message as {
      role?: string;
      stopReason?: string;
      content?: Array<{ type?: string; text?: string }>;
    };
    if (message.role !== "assistant" || message.stopReason === "pending") continue;
    const text = (message.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("\n");
    if (text.trim()) texts.push(text);
  }
  return texts;
}

/**
 * Code blocks, newest message first. `limit` caps how many code-bearing
 * messages are included; `null` includes all history.
 */
function buildItems(ctx: ExtensionContext, limit: number | null): Item[] {
  const texts = assistantTexts(ctx);
  const items: Item[] = [];
  let groupRank = 0;

  for (let position = texts.length - 1; position >= 0; position--) {
    const blocks = parseCodeBlocks(texts[position]).filter((block) => block.code.trim() !== "");
    if (blocks.length === 0) continue;
    groupRank += 1;
    if (limit !== null && groupRank > limit) break;

    for (const block of blocks) {
      const lines = block.code.split("\n");
      items.push({
        index: items.length + 1,
        groupRank,
        language: block.language,
        code: block.code,
        lineCount: lines.length,
        firstLine: lines.find((line) => line.trim() !== "")?.trim() ?? "",
      });
    }
  }

  return items;
}

function groupLabel(rank: number): string {
  if (rank === 1) return "latest message";
  if (rank === 2) return "previous message";
  return `${rank - 1} messages back`;
}

/** Parse `/cbc <n>` or `/cbc #<n>`; returns null when the argument is not a positive integer. */
function parseSelector(args: string): number | null {
  const match = args.trim().match(/^#?(\d+)$/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 ? value : null;
}

async function copyItems(items: Item[], ctx: ExtensionContext): Promise<void> {
  const text = items.map((item) => item.code).join("\n\n");
  try {
    await copyToClipboard(text);
    ctx.ui.notify(
      items.length === 1
        ? `Copied code block ${items[0].index} to the clipboard`
        : `Copied ${items.length} code blocks to the clipboard`,
      "info",
    );
  } catch (error) {
    ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
  }
}

/** Interactively pick one or more blocks. `recent` is always a prefix of `all`. */
async function openPicker(ctx: ExtensionContext, recent: Item[], all: Item[]): Promise<Item[] | null> {
  return ctx.ui.custom<Item[] | null>((tui, theme, _keybindings, done) => {
    let scope: "recent" | "all" = "recent";
    let cursor = 0;
    let scroll = 0;
    let selected = new Set<number>();

    const items = (): Item[] => (scope === "recent" ? recent : all);
    const positionOf = (item: Item): number => items().indexOf(item);

    const buildRows = (width: number): { text: string; item: Item | null }[] => {
      const rows: { text: string; item: Item | null }[] = [];
      const activeItems = items();
      const languageWidth = Math.max(4, ...activeItems.map((item) => visibleWidth(item.language || "code")));
      let lastRank = 0;
      for (const item of activeItems) {
        if (item.groupRank !== lastRank) {
          lastRank = item.groupRank;
          if (rows.length > 0) rows.push({ text: "", item: null });
          rows.push({ text: theme.fg("dim", `  ${groupLabel(item.groupRank)}`), item: null });
        }
        const pointer = positionOf(item) === cursor ? theme.fg("accent", "> ") : "  ";
        const state = selected.has(item.index) ? theme.fg("success", "●") : theme.fg("dim", "○");
        const numberIndicator = numberedItemIndicator(item.index);
        const languageText = item.language || "code";
        const language = item.language ? theme.fg("accent", languageText) : theme.fg("dim", languageText);
        const languagePadding = " ".repeat(Math.max(0, languageWidth - visibleWidth(languageText)));
        const preview = item.firstLine ? theme.fg("muted", ` · ${safeDisplay(item.firstLine)}`) : "";
        const count = theme.fg("dim", ` (${item.lineCount} ${item.lineCount === 1 ? "line" : "lines"})`);
        rows.push({
          text: truncateToWidth(`${pointer}${state} ${numberIndicator} ${language}${languagePadding}${preview}${count}`, width),
          item,
        });
      }
      return rows;
    };

    const clampCursor = () => {
      cursor = Math.min(Math.max(0, cursor), Math.max(0, items().length - 1));
    };

    return {
      render(width: number): string[] {
        const rows = buildRows(width);
        const maxView = Math.max(5, tui.terminal.rows - 8);
        const clipped = rows.length > maxView;
        const view = clipped ? Math.max(1, maxView - 2) : maxView;
        const cursorRow = rows.findIndex((row) => row.item !== null && positionOf(row.item) === cursor);

        let start = Math.min(Math.max(0, scroll), Math.max(0, rows.length - view));
        if (cursorRow >= 0) {
          if (cursorRow < start) start = cursorRow;
          else if (cursorRow >= start + view) start = cursorRow - view + 1;
        }
        scroll = start;

        const visible = rows.slice(start, start + view).map((row) => row.text);
        if (clipped) {
          const above = start;
          const below = rows.length - (start + view);
          visible.unshift(above > 0 ? theme.fg("dim", `  ↑ ${above} more`) : "");
          visible.push(below > 0 ? theme.fg("dim", `  ↓ ${below} more`) : "");
        }

        const scopeLabel = scope === "recent" ? `last ${RECENT_MESSAGE_LIMIT} messages with code` : "all history";
        return [
          theme.fg("accent", "─".repeat(width)),
          truncateToWidth(` ${theme.fg("accent", theme.bold(`Code blocks — ${scopeLabel}`))}`, width),
          "",
          ...visible,
          "",
          truncateToWidth(theme.fg("dim", " ↑↓ move • 1-9/Space toggle • Tab recent/all • Enter copy • Esc cancel"), width),
          theme.fg("accent", "─".repeat(width)),
        ];
      },
      invalidate() {},
      handleInput(data: string): void {
        if (matchesKey(data, Key.up)) {
          cursor -= 1;
        } else if (matchesKey(data, Key.down)) {
          cursor += 1;
        } else if (matchesKey(data, Key.space)) {
          const item = items()[cursor];
          if (item) {
            if (selected.has(item.index)) selected.delete(item.index);
            else selected.add(item.index);
          }
        } else if (matchesKey(data, Key.tab)) {
          scope = scope === "recent" ? "all" : "recent";
        } else if (matchesKey(data, Key.enter)) {
          const chosen = all.filter((item) => selected.has(item.index));
          const fallback = items()[cursor];
          done(chosen.length > 0 ? chosen : fallback ? [fallback] : null);
          return;
        } else if (matchesKey(data, Key.escape)) {
          done(null);
          return;
        } else {
          const numberKey = NUMBERED_SELECTION_KEYS.find((key) => matchesKey(data, key));
          if (!numberKey) return;
          const nextSelection = toggleNumberedSelection(items(), selected, Number(numberKey));
          if (!nextSelection) return;
          selected = nextSelection;
        }
        clampCursor();
        tui.requestRender();
      },
    };
  });
}

/** Shared entry point for the `/cbc` command and the keyboard shortcut. */
async function runCodeBlockCopy(ctx: ExtensionContext, args: string): Promise<void> {
  if (ctx.mode !== "tui") {
    ctx.ui.notify("Code block copy requires interactive mode", "warning");
    return;
  }

  const recent = buildItems(ctx, RECENT_MESSAGE_LIMIT);
  if (recent.length === 0) {
    ctx.ui.notify("No code blocks in the recent assistant messages", "warning");
    return;
  }

  const selector = parseSelector(args);
  if (selector !== null) {
    const item = recent.find((candidate) => candidate.index === selector);
    if (!item) {
      ctx.ui.notify(`No code block ${selector} in the recent messages.`, "warning");
      return;
    }
    await copyItems([item], ctx);
    return;
  }

  if (recent.length === 1) {
    await copyItems(recent, ctx);
    return;
  }

  const all = buildItems(ctx, null);
  const chosen = await openPicker(ctx, recent, all);
  if (chosen && chosen.length > 0) await copyItems(chosen, ctx);
}

export default function codeBlockCopy(pi: ExtensionAPI) {
  pi.registerShortcut(Key.ctrl(Key.backtick), {
    description: "Copy a code block from a recent assistant message",
    handler: (ctx) => runCodeBlockCopy(ctx, ""),
  });

  pi.registerCommand("cbc", {
    description: "Copy a code block from a recent assistant message",
    handler: (args, ctx) => runCodeBlockCopy(ctx, args),
  });
}
