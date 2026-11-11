/**
 * Fenced code block extraction.
 *
 * Follows the CommonMark fenced code block rules closely enough for assistant
 * output: opening fences use three or more backticks or tildes, indented no
 * more than three spaces, and a closing fence of the same character and at
 * least the same length. Content is dedented by up to the opening fence's
 * indentation, so a block nested in a list loses the list indent.
 * Blocks wrapped with the exact "│ " prefix lose only that wrapper before
 * the same fence and indentation rules apply.
 */

/** Matches a fence line: up to three leading spaces, a run of backticks or tildes, then the info string. */
const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/;

/**
 * Extract every fenced code block from Markdown text.
 *
 * @param {string} markdown
 * @returns {{ language: string, info: string, code: string, startLine: number, endLine: number, closed: boolean }[]}
 */
export function parseCodeBlocks(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const blocks = [];

  for (let i = 0; i < lines.length; i++) {
    const wrapped = lines[i].startsWith("│ ");
    const open = FENCE.exec(wrapped ? stripWrapper(lines[i]) : lines[i]);
    if (!open) continue;

    const indent = open[1];
    const fence = open[2];
    const info = open[3].trim();

    // A backtick fence's info string may not contain a backtick (CommonMark).
    if (fence[0] === "`" && info.includes("`")) continue;

    const body = [];
    let closeLine = -1;
    let j = i + 1;
    for (; j < lines.length; j++) {
      const line = wrapped ? stripWrapper(lines[j]) : lines[j];
      // An unfinished wrapped block must not consume text outside its wrapper.
      if (line === null) break;
      const close = FENCE.exec(line);
      if (close && close[2][0] === fence[0] && close[2].length >= fence.length && close[3].trim() === "") {
        closeLine = j;
        break;
      }
      body.push(line);
    }

    const code = body.map((line) => stripUpTo(line, indent.length)).join("\n");
    blocks.push({
      language: info.split(/\s+/)[0] || "",
      info,
      code,
      startLine: i + 1,
      endLine: closeLine === -1 ? j : closeLine + 1,
      closed: closeLine !== -1,
    });

    // Revisit a wrapper boundary so a following ordinary block can still open.
    i = closeLine === -1 ? j - 1 : closeLine;
  }

  return blocks;
}

/** Remove one exact wrapper, accepting a bare bar only as an empty line. */
function stripWrapper(line) {
  if (line === "│") return "";
  return line.startsWith("│ ") ? line.slice(2) : null;
}

/** Remove up to `count` leading spaces from a line. */
function stripUpTo(line, count) {
  let removed = 0;
  while (removed < count && line[removed] === " ") removed += 1;
  return line.slice(removed);
}
