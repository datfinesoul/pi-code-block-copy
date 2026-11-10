/**
 * Fenced code block extraction.
 *
 * Follows the CommonMark fenced code block rules closely enough for assistant
 * output: opening fences use three or more backticks or tildes, indented no
 * more than three spaces, and a closing fence of the same character and at
 * least the same length. Content is dedented by up to the opening fence's
 * indentation, so a block nested in a list loses the list indent.
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
    const open = FENCE.exec(lines[i]);
    if (!open) continue;

    const indent = open[1];
    const fence = open[2];
    const info = open[3].trim();

    // A backtick fence's info string may not contain a backtick (CommonMark).
    if (fence[0] === "`" && info.includes("`")) continue;

    const body = [];
    let closeLine = -1;
    for (let j = i + 1; j < lines.length; j++) {
      const close = FENCE.exec(lines[j]);
      if (close && close[2][0] === fence[0] && close[2].length >= fence.length && close[3].trim() === "") {
        closeLine = j;
        break;
      }
      body.push(lines[j]);
    }

    const code = body.map((line) => stripUpTo(line, indent.length)).join("\n");
    blocks.push({
      language: info.split(/\s+/)[0] || "",
      info,
      code,
      startLine: i + 1,
      endLine: closeLine === -1 ? lines.length : closeLine + 1,
      closed: closeLine !== -1,
    });

    i = closeLine === -1 ? lines.length : closeLine;
  }

  return blocks;
}

/** Remove up to `count` leading spaces from a line. */
function stripUpTo(line, count) {
  let removed = 0;
  while (removed < count && line[removed] === " ") removed += 1;
  return line.slice(removed);
}
