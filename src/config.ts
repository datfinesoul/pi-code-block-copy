import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_RECENT_MESSAGE_LIMIT = 3;
export const MAX_RECENT_MESSAGE_LIMIT = 20;

/** Read layers in precedence order. Invalid layers leave the previous value intact. */
export function loadConfig({ bundledPath, agentDir, cwd, projectTrusted, projectConfigDir = ".pi", read = readFileSync }) {
  let recentMessageLimit = DEFAULT_RECENT_MESSAGE_LIMIT;
  let parseQuotedBlocks = true;
  const warnings = [];
  const paths = [bundledPath, join(agentDir, "code-block-copy.json")];
  if (projectTrusted) paths.push(join(cwd, projectConfigDir, "code-block-copy.json"));
  for (const path of paths) {
    try {
      const config = JSON.parse(read(path, "utf8"));
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("expected a JSON object");
      }
      const limit = Object.hasOwn(config, "recentMessageLimit") ? config.recentMessageLimit : recentMessageLimit;
      const quoted = Object.hasOwn(config, "parseQuotedBlocks") ? config.parseQuotedBlocks : parseQuotedBlocks;
      const errors = [];
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RECENT_MESSAGE_LIMIT) {
        errors.push(`recentMessageLimit must be an integer from 1 to ${MAX_RECENT_MESSAGE_LIMIT}`);
      }
      if (typeof quoted !== "boolean") errors.push("parseQuotedBlocks must be a boolean");
      if (errors.length > 0) throw new Error(errors.join("; "));
      // Validate the entire layer before applying either field.
      recentMessageLimit = limit;
      parseQuotedBlocks = quoted;
    } catch (error) {
      if (error.code !== "ENOENT") warnings.push(`Code block copy configuration ${path}: ${error.message}`);
    }
  }
  return { recentMessageLimit, parseQuotedBlocks, warnings };
}
