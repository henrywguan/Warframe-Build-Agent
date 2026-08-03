import { readFile } from "node:fs/promises";
import { pullCatalog } from "./catalog.js";
import type { OverframeBuildRank } from "./constants.js";
import { pullOfficialDigests } from "./official.js";
import {
  buildsFromImport,
  crawlOverframeTopBuilds,
  indexModsFromBuilds,
} from "./overframe.js";
import { resolveRepoRoot } from "./repo-root.js";
import { saveKnowledgePack } from "./store.js";
import type { ItemBuilds, KnowledgeManifest, OfficialDigest, OverframeBuild } from "./types.js";
import { pullWikiDigests } from "./wiki.js";

export type PullOptions = {
  repoRoot?: string;
  limit?: number;
  includeArchwing?: boolean;
  skipWiki?: boolean;
  skipOverframe?: boolean;
  skipOfficial?: boolean;
  importBuildsPath?: string;
  concurrency?: number;
  onLog?: (line: string) => void;
};

type ImportBuildRow = {
  itemName: string;
  builds: Array<Omit<OverframeBuild, "rank"> & { rank?: OverframeBuildRank }>;
};

async function loadImportedBuilds(filePath: string): Promise<ImportBuildRow[]> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as
    | ImportBuildRow[]
    | { builds?: ImportBuildRow[] };
  return Array.isArray(raw) ? raw : (raw.builds ?? []);
}

function mergeBuildEntries(primary: ItemBuilds[], secondary: ItemBuilds[]): ItemBuilds[] {
  const map = new Map<string, ItemBuilds>();
  for (const entry of secondary) map.set(entry.id, entry);
  for (const entry of primary) map.set(entry.id, entry);
  return [...map.values()];
}

export async function pullKnowledgePack(options: PullOptions = {}): Promise<KnowledgeManifest> {
  const repoRoot = options.repoRoot ?? resolveRepoRoot();
  const log = options.onLog ?? ((line: string) => console.log(line));
  const notes: string[] = [
    "Agent-usable text pack: WFCD catalog + Warframe Wiki + official warframe.com digests + Overframe top builds.",
    "Media/images are intentionally omitted from the pack (screenshots are handled at chat time).",
  ];

  log("Pulling WFCD catalog (warframes + weapons)...");
  let catalog = await pullCatalog({ includeArchwing: options.includeArchwing });
  log(`Catalog: ${catalog.length} items`);

  if (options.limit && options.limit > 0) {
    catalog = catalog.slice(0, options.limit);
    notes.push(`Pull limited to first ${catalog.length} catalog items.`);
    log(`Limited to first ${catalog.length} items for this run`);
  }

  let wikiDigests: Awaited<ReturnType<typeof pullWikiDigests>>["digests"] = [];
  if (!options.skipWiki) {
    log("Pulling Warframe Wiki digests...");
    const result = await pullWikiDigests(catalog, {
      repoRoot,
      concurrency: options.concurrency ?? 4,
      onProgress: (done, total, name) => {
        if (done % 25 === 0 || done === total) {
          log(`  wiki ${done}/${total} (last: ${name})`);
        }
      },
    });
    wikiDigests = result.digests;
    log(`Wiki: wrote ${wikiDigests.length}, failed ${result.failed}`);
    if (result.failed) notes.push(`Wiki digests failed for ${result.failed} items.`);
  } else {
    notes.push("Wiki digests skipped.");
  }

  let overframeStatus: KnowledgeManifest["overframeStatus"] = "skipped";
  let buildEntries: ItemBuilds[] = [];

  if (!options.skipOverframe) {
    log("Crawling Overframe top builds + mods/arcanes (best-effort)...");
    const scraped = await crawlOverframeTopBuilds(catalog, {
      concurrency: Math.min(2, options.concurrency ?? 2),
      onLog: log,
      onProgress: (done, total, name) => {
        if (done % 25 === 0 || done === total) {
          log(`  overframe ${done}/${total} (last: ${name})`);
        }
      },
    });
    buildEntries = scraped.entries;
    overframeStatus = scraped.status;
    notes.push(scraped.note);
    log(
      `Overframe crawl: ${scraped.entries.filter((e) => e.builds.length).length} items with builds (${overframeStatus})`,
    );
  } else {
    notes.push("Overframe scrape skipped.");
  }

  if (options.importBuildsPath) {
    log(`Importing builds from ${options.importBuildsPath}...`);
    const importedRows = await loadImportedBuilds(options.importBuildsPath);
    const catalogNames = new Set(catalog.map((item) => item.name.toLowerCase()));
    const unmatched = importedRows.filter((row) => !catalogNames.has(row.itemName.toLowerCase()));
    if (unmatched.length) {
      log(
        `  import: ${unmatched.length} row(s) not in this pull's catalog (e.g. ${unmatched
          .slice(0, 3)
          .map((row) => row.itemName)
          .join(", ")})`,
      );
    }
    const imported = buildsFromImport(catalog, importedRows);
    buildEntries = mergeBuildEntries(imported, buildEntries);
    if (imported.length > 0) {
      overframeStatus = overframeStatus === "blocked" ? "partial" : "ok";
      notes.push(`Imported ${imported.length} item build set(s) from ${options.importBuildsPath}.`);
    } else {
      notes.push(
        `Import file had no matching catalog items (${importedRows.length} row(s) read from ${options.importBuildsPath}).`,
      );
    }
    log(`Builds after import: ${buildEntries.length} items with builds`);
  }

  // Drop empty Overframe stubs; blocked/partial status lives on the manifest.
  buildEntries = buildEntries.filter((entry) => entry.builds.length > 0);

  let officialDigests: OfficialDigest[] = [];
  if (!options.skipOfficial) {
    log("Pulling official warframe.com digests (patch hub + news)...");
    try {
      const official = await pullOfficialDigests({
        repoRoot,
        limit: options.limit && options.limit > 0 ? Math.min(12, options.limit) : 12,
        onLog: log,
      });
      officialDigests = official.digests;
      notes.push(official.note);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      notes.push(`Official site digests failed: ${message}`);
      log(`Official digests failed: ${message}`);
    }
  } else {
    notes.push("Official site digests skipped.");
  }

  const mods = indexModsFromBuilds(buildEntries);
  const manifest = await saveKnowledgePack({
    repoRoot,
    catalog,
    wiki: wikiDigests,
    builds: buildEntries,
    mods,
    official: officialDigests,
    overframeStatus,
    notes,
  });

  log(
    `Manifest written: ${manifest.counts.catalogItems} items, ${manifest.counts.wikiDigests} wiki digests, ${manifest.counts.buildEntries} build entries, ${manifest.counts.officialDigests ?? 0} official digests (${manifest.overframeStatus})`,
  );
  return manifest;
}
