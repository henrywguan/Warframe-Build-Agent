import { existsSync } from "node:fs";
import path from "node:path";

/** Resolve monorepo root whether cwd is repo root or web/. */
export function resolveRepoRoot(start = process.cwd()): string {
  const candidates = [start, path.resolve(start, ".."), path.resolve(start, "../..")];
  for (const candidate of candidates) {
    if (
      existsSync(path.join(candidate, "package.json")) &&
      existsSync(path.join(candidate, "data"))
    ) {
      return candidate;
    }
  }
  return start;
}
