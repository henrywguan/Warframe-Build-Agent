/** Stub for Warframe Public Export sync (WFCD / community export flow). */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveRepoRoot } from "./repo-root.js";
import { writeFileDurable } from "./fs-write.js";

export type PublicExportIndex = {
  status: "stub";
  fetchedAt: string;
  notes: string;
};

const README = `# Public Export (stub)

This folder will hold synced **Public Export** game data when \`pull-public-export\` is wired to a live source.

## Intended flow

1. Download or generate a Public Export bundle (WFCD / official export tooling).
2. Run \`npm run knowledge -- pull-public-export\` to refresh \`index.json\` and derived digests.
3. Use **inventory-import** / **profile-set** for personal ownership — separate from catalog sync.

## Current status

Stub only — no network pull yet. See \`docs/offline-knowledge.md\` and the **public-export-sync** skill.
`;

export function publicExportDir(repoRoot?: string): string {
  return path.join(resolveRepoRoot(repoRoot), "data", "knowledge", "public-export");
}

export async function pullPublicExportStub(repoRoot?: string): Promise<PublicExportIndex> {
  const root = resolveRepoRoot(repoRoot);
  const dir = publicExportDir(root);
  await mkdir(dir, { recursive: true });

  const index: PublicExportIndex = {
    status: "stub",
    fetchedAt: new Date().toISOString(),
    notes:
      "Public Export pull not implemented — placeholder for future WFCD/export integration.",
  };

  await writeFileDurable(path.join(dir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  await writeFile(path.join(dir, "README.md"), README, "utf8");

  return index;
}

export function formatPublicExportStubResult(index: PublicExportIndex, repoRoot?: string): string {
  const dir = publicExportDir(repoRoot);
  return [
    "Public Export pull (stub)",
    "",
    `Status: ${index.status}`,
    `Fetched: ${index.fetchedAt}`,
    index.notes,
    "",
    `Wrote: ${dir}/README.md`,
    `Wrote: ${dir}/index.json`,
  ].join("\n");
}
