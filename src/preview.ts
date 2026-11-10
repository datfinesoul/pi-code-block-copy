/** Remove model-supplied terminal sequences and controls before display. */
export function safeDisplay(value) {
  return value
    .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, "")
    .replace(/\x1B(?:\[[0-?]*[ -/]*[@-~]|[@-_])/g, "")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
}

/** A language-independent excerpt; never modifies the source used for copying. */
export function compactPreview(code) {
  const lines = code.split("\n").map((line) => safeDisplay(line).trim()).filter(Boolean);
  if (!lines.length) return "";
  if (lines.every((line) => /^[\[\]{}()\s]+$/.test(line))) {
    return lines.join("").replace(/\s/g, "");
  }
  let opening = "";
  let start = 0;
  while (start < lines.length && /^[\[({\s]+$/.test(lines[start])) {
    opening += lines[start].replace(/\s/g, "");
    start += 1;
  }
  if (!opening) return lines[0];
  const remaining = lines.slice(start);
  const excerpt = [];
  let consumed = 0;
  for (const line of remaining) {
    if (/^[\[\]{}()\s]+$/.test(line) || excerpt.length === 2) break;
    excerpt.push(line);
    consumed += 1;
  }
  return `${opening} …${excerpt.length ? ` ${excerpt.join(" ↵ ")}` : ""}${consumed < remaining.length ? " …" : ""}`;
}

/** At most six source lines plus an omission notice, within the supplied row budget. */
export function expandedPreview(code, budget) {
  const lines = code.split("\n");
  const available = Math.max(0, Math.floor(budget));
  if (!available) return [];
  const count = Math.min(6, lines.length, lines.length <= available ? available : Math.max(0, available - 1));
  const result = lines.slice(0, count).map((line) => `      ${safeDisplay(line.replace(/\t/g, "    "))}`);
  if (count < lines.length) result.push(`      … ${lines.length - count} more lines`);
  return result;
}
