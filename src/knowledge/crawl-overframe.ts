import { readFile, readdir } from "node:fs/promises";
import { pullCatalog } from "./catalog.js";
import {
  buildsFromImport,
  crawlOverframeTopBuilds,
  indexModsFromBuilds,
} from "./overframe.js";
import { knowledgePaths } from "./paths.js";
import { resolveRepoRoot } from "./repo-root.js";
import { loadCatalog, loadItemBuilds, loadManifest, saveBuildCrawl } from "./store.js";
import type { ItemBuilds, KnowledgeManifest, OverframeBuild } from "./types.js";

export type CrawlOverframeCliOptions = {
  repoRoot?: string;
  limit?: number;
  includeArchwing?: boolean;
  concurrency?: number;
  delayMs?: number;
  skipBuildPages?: boolean;
  importBuildsPath?: string;
  /** Refresh WFCD catalog before crawl (default: use existing catalog if present). */
  refreshCatalog?: boolean;
  onLog?: (line: string) => void;
};

type ImportBuildRow = {
  itemName: string;
  builds: Array<Omit<OverframeBuild, "rank"> & { rank?: 1 | 2 | 3 }>;
};

async function loadImportedBuilds(filePath: string): Promise<ImportBuildRow[]> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as
    | ImportBuildRow[]
    | { builds?: ImportBuildRow[] };
  return Array.isArray(raw) ? raw : (raw.builds ?? []);
}

async function loadExistingBuilds(repoRoot: string): Promise<ItemBuilds[]> {
  const dir = knowledgePaths(repoRoot).buildsDir;
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: ItemBuilds[] = [];
  for (const file of files) {
    const entry = await loadItemBuilds(file.replace(/\.json$/, ""), repoRoot);
    if (entry?.builds?.length) out.push(entry);
  }
  return out;
}

/**
 * Crawl overframe.gg for every catalog warframe/weapon:
 * top 3 builds → open each build page → scan mods + arcanes → local pack.
 */
export async function runOverframeCrawl(
  options: CrawlOverframeCliOptions = {},
): Promise<KnowledgeManifest> {
  const repoRoot = options.repoRoot ?? resolveRepoRoot();
  const log = options.onLog ?? ((line: string) => console.log(line));
  const notes: string[] = [
    "Overframe crawl: top 3 builds per item with mods + arcanes scanned into local knowledge pack.",
  ];

  let catalog = options.refreshCatalog ? [] : await loadCatalog(repoRoot);
  // Tiny catalogs are usually leftover from a --limit crawl; refresh so imports match.
  if (!catalog.length || options.refreshCatalog || catalog.length < 50) {
    log("Refreshing WFCD catalog (warframes + weapons)...");
    catalog = await pullCatalog({ includeArchwing: options.includeArchwing });
  } else {
    log(`Using existing catalog: ${catalog.length} items`);
  }

  const catalogForSave = catalog;
  if (options.limit && options.limit > 0) {
    catalog = catalog.slice(0, options.limit);
    notes.push(`Crawl limited to first ${catalog.length} catalog items.`);
    log(`Limited to first ${catalog.length} items`);
  }

  let buildEntries: ItemBuilds[] = [];
  let overframeStatus: KnowledgeManifest["overframeStatus"] = "skipped";

  if (options.importBuildsPath) {
    log(`Importing builds from ${options.importBuildsPath} (no live crawl)...`);
    const rows = await loadImportedBuilds(options.importBuildsPath);
    buildEntries = buildsFromImport(catalogForSave, rows);
    overframeStatus = buildEntries.length ? "partial" : "blocked";
    notes.push(`Imported ${buildEntries.length} item build set(s) from ${options.importBuildsPath}.`);
  } else {
    log("Crawling Overframe: item pages → top 3 builds → build pages (mods + arcanes)...");
    const crawled = await crawlOverframeTopBuilds(catalog, {
      concurrency: options.concurrency ?? 2,
      delayMs: options.delayMs ?? 450,
      skipBuildPages: options.skipBuildPages,
      onLog: log,
      onProgress: (done, total, name) => {
        if (done % 10 === 0 || done === total) {
          log(`  overframe ${done}/${total} (last: ${name})`);
        }
      },
    });
    buildEntries = crawled.entries;
    overframeStatus = crawled.status;
    notes.push(crawled.note);

    // Don't wipe a previous successful crawl when this network is Cloudflare-blocked.
    if (!buildEntries.length && crawled.status === "blocked") {
      const existing = await loadExistingBuilds(repoRoot);
      if (existing.length) {
        buildEntries = existing;
        overframeStatus = "partial";
        notes.push(
          `Live crawl blocked; kept ${existing.length} previously saved local Overframe build file(s).`,
        );
        log(`Kept ${existing.length} existing local build file(s) after blocked crawl`);
      }
    }
  }

  const mods = indexModsFromBuilds(buildEntries);
  log(`Indexed ${mods.length} unique mods/arcanes from crawled builds`);

  const previous = await loadManifest(repoRoot);
  const manifest = await saveBuildCrawl({
    repoRoot,
    // Never persist a --limit slice over the full catalog.
    catalog: catalogForSave,
    builds: buildEntries,
    mods,
    overframeStatus,
    notes: [...(previous?.notes ?? []).filter((n) => !n.startsWith("Overframe crawl:")), ...notes],
    previous,
  });

  log(
    `Saved: ${manifest.counts.buildEntries} items with builds, ${manifest.counts.modsIndexed} mods/arcanes (${manifest.overframeStatus})`,
  );
  return manifest;
}
