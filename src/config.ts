import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_RECENT_MESSAGE_LIMIT = 3;
export const MAX_RECENT_MESSAGE_LIMIT = 20;

/** Read layers in precedence order. Invalid layers leave the previous value intact. */
export function loadConfig({ bundledPath, agentDir, cwd, projectTrusted, projectConfigDir = ".pi", read = readFileSync }) {
  let recentMessageLimit = DEFAULT_RECENT_MESSAGE_LIMIT;
  const warnings = [];
  const paths = [bundledPath, join(agentDir, "code-block-copy.json")];
  if (projectTrusted) paths.push(join(cwd, projectConfigDir, "code-block-copy.json"));
  for (const path of paths) {
    try {
      const config = JSON.parse(read(path, "utf8"));
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("expected a JSON object");
      }
      if (!Object.hasOwn(config, "recentMessageLimit")) continue;
      const value = config.recentMessageLimit;
      if (!Number.isInteger(value) || value < 1 || value > MAX_RECENT_MESSAGE_LIMIT) {
        throw new Error(`recentMessageLimit must be an integer from 1 to ${MAX_RECENT_MESSAGE_LIMIT}`);
      }
      recentMessageLimit = value;
    } catch (error) {
      if (error.code !== "ENOENT") warnings.push(`Code block copy configuration ${path}: ${error.message}`);
    }
  }
  return { recentMessageLimit, warnings };
}
