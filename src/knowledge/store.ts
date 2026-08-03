import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { writeFileDurable } from "./fs-write.js";
import { knowledgePaths } from "./paths.js";
import type {
  CatalogItem,
  ItemBuilds,
  KnowledgeManifest,
  MechanicsDigest,
  ModDigest,
  OfficialDigest,
  WikiDigest,
} from "./types.js";

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFileDurable(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function saveKnowledgePack(options: {
  repoRoot?: string;
  catalog: CatalogItem[];
  wiki: WikiDigest[];
  builds: ItemBuilds[];
  mods: ModDigest[];
  official?: OfficialDigest[];
  mechanics?: MechanicsDigest[];
  overframeStatus: KnowledgeManifest["overframeStatus"];
  notes: string[];
  /** When false (default), skip re-writing per-item wiki digests already flushed by pull. */
  rewriteWikiDigests?: boolean;
}): Promise<KnowledgeManifest> {
  const paths = knowledgePaths(options.repoRoot);
  await mkdir(paths.root, { recursive: true });
  await mkdir(paths.wikiDir, { recursive: true });
  await mkdir(paths.buildsDir, { recursive: true });
  if (options.official?.length) {
    await mkdir(paths.officialDir, { recursive: true });
  }
  if (options.mechanics?.length) {
    await mkdir(paths.mechanicsDir, { recursive: true });
  }

  await writeJson(paths.catalog, options.catalog);
  await writeJson(paths.wikiIndex, {
    count: options.wiki.length,
    ids: options.wiki.map((w) => w.id),
  });
  await writeJson(paths.buildsIndex, {
    count: options.builds.length,
    withBuilds: options.builds.filter((b) => b.builds.length > 0).length,
    ids: options.builds.map((b) => b.id),
  });
  await writeJson(paths.mods, options.mods);

  // Skip by default: digests are flushed in pullWikiDigests; rewrites thrash OneDrive locks.
  if (options.rewriteWikiDigests) {
    for (const digest of options.wiki) {
      await writeJson(path.join(paths.wikiDir, `${digest.id}.json`), digest);
    }
  }
  for (const entry of options.builds) {
    await writeJson(path.join(paths.buildsDir, `${entry.id}.json`), entry);
  }
  if (options.official?.length) {
    for (const digest of options.official) {
      await writeJson(path.join(paths.officialDir, `${digest.id}.json`), digest);
    }
    await writeJson(paths.officialIndex, {
      count: options.official.length,
      ids: options.official.map((d) => d.id),
    });
  }
  if (options.mechanics?.length) {
    for (const digest of options.mechanics) {
      await writeJson(path.join(paths.mechanicsDir, `${digest.id}.json`), digest);
    }
    await writeJson(paths.mechanicsIndex, {
      count: options.mechanics.length,
      ids: options.mechanics.map((d) => d.id),
      kinds: Object.fromEntries(
        [...new Set(options.mechanics.map((d) => d.kind))].map((kind) => [
          kind,
          options.mechanics!.filter((d) => d.kind === kind).length,
        ]),
      ),
    });
  }

  const manifest: KnowledgeManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      wfcd: "https://api.warframestat.us",
      wiki: "https://wiki.warframe.com",
      overframe: "https://overframe.gg",
      official: "https://www.warframe.com",
    },
    counts: {
      catalogItems: options.catalog.length,
      wikiDigests: options.wiki.length,
      buildEntries: options.builds.filter((b) => b.builds.length > 0).length,
      modsIndexed: options.mods.length,
      officialDigests: options.official?.length ?? 0,
      mechanicsDigests: options.mechanics?.length ?? 0,
    },
    notes: options.notes,
    overframeStatus: options.overframeStatus,
  };
  await writeJson(paths.manifest, manifest);
  return manifest;
}

export async function loadManifest(repoRoot?: string): Promise<KnowledgeManifest | null> {
  return readJson(knowledgePaths(repoRoot).manifest);
}

export async function loadCatalog(repoRoot?: string): Promise<CatalogItem[]> {
  return (await readJson<CatalogItem[]>(knowledgePaths(repoRoot).catalog)) || [];
}

export async function loadWikiDigest(
  id: string,
  repoRoot?: string,
): Promise<WikiDigest | null> {
  return readJson(path.join(knowledgePaths(repoRoot).wikiDir, `${id}.json`));
}

export async function loadItemBuilds(
  id: string,
  repoRoot?: string,
): Promise<ItemBuilds | null> {
  return readJson(path.join(knowledgePaths(repoRoot).buildsDir, `${id}.json`));
}

export async function loadMods(repoRoot?: string): Promise<ModDigest[]> {
  return (await readJson<ModDigest[]>(knowledgePaths(repoRoot).mods)) || [];
}

export async function loadOfficialDigests(repoRoot?: string): Promise<OfficialDigest[]> {
  const paths = knowledgePaths(repoRoot);
  const index = await readJson<{ ids?: string[] }>(paths.officialIndex);
  if (!index?.ids?.length) return [];
  const out: OfficialDigest[] = [];
  for (const id of index.ids) {
    const digest = await readJson<OfficialDigest>(path.join(paths.officialDir, `${id}.json`));
    if (digest) out.push(digest);
  }
  return out;
}

export async function loadMechanicsDigests(repoRoot?: string): Promise<MechanicsDigest[]> {
  const paths = knowledgePaths(repoRoot);
  const index = await readJson<{ ids?: string[] }>(paths.mechanicsIndex);
  if (!index?.ids?.length) return [];
  const out: MechanicsDigest[] = [];
  for (const id of index.ids) {
    const digest = await readJson<MechanicsDigest>(
      path.join(paths.mechanicsDir, `${id}.json`),
    );
    if (digest) out.push(digest);
  }
  return out;
}

/** Update mechanics digests without rewriting catalog/wiki/builds. */
export async function saveMechanicsCrawl(options: {
  repoRoot?: string;
  mechanics: MechanicsDigest[];
  notes: string[];
  previous?: KnowledgeManifest | null;
}): Promise<KnowledgeManifest> {
  const paths = knowledgePaths(options.repoRoot);
  await mkdir(paths.root, { recursive: true });
  await mkdir(paths.mechanicsDir, { recursive: true });

  for (const digest of options.mechanics) {
    await writeJson(path.join(paths.mechanicsDir, `${digest.id}.json`), digest);
  }
  await writeJson(paths.mechanicsIndex, {
    count: options.mechanics.length,
    ids: options.mechanics.map((d) => d.id),
    kinds: Object.fromEntries(
      [...new Set(options.mechanics.map((d) => d.kind))].map((kind) => [
        kind,
        options.mechanics.filter((d) => d.kind === kind).length,
      ]),
    ),
  });

  const previous = options.previous;
  const manifest: KnowledgeManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      wfcd: previous?.sources.wfcd ?? "https://api.warframestat.us",
      wiki: previous?.sources.wiki ?? "https://wiki.warframe.com",
      overframe: previous?.sources.overframe ?? "https://overframe.gg",
      official: previous?.sources.official ?? "https://www.warframe.com",
    },
    counts: {
      catalogItems: previous?.counts.catalogItems ?? 0,
      wikiDigests: previous?.counts.wikiDigests ?? 0,
      buildEntries: previous?.counts.buildEntries ?? 0,
      modsIndexed: previous?.counts.modsIndexed ?? 0,
      officialDigests: previous?.counts.officialDigests ?? 0,
      mechanicsDigests: options.mechanics.length,
    },
    notes: [...(previous?.notes ?? []).slice(-8), ...options.notes],
    overframeStatus: previous?.overframeStatus ?? "skipped",
  };
  await writeJson(paths.manifest, manifest);
  return manifest;
}

/** Update builds + mod index without rewriting wiki digests. */
export async function saveBuildCrawl(options: {
  repoRoot?: string;
  catalog: CatalogItem[];
  builds: ItemBuilds[];
  mods: ModDigest[];
  overframeStatus: KnowledgeManifest["overframeStatus"];
  notes: string[];
  previous?: KnowledgeManifest | null;
}): Promise<KnowledgeManifest> {
  const paths = knowledgePaths(options.repoRoot);
  await mkdir(paths.root, { recursive: true });
  await mkdir(paths.buildsDir, { recursive: true });

  await writeJson(paths.catalog, options.catalog);
  await writeJson(paths.buildsIndex, {
    count: options.builds.length,
    withBuilds: options.builds.filter((b) => b.builds.length > 0).length,
    ids: options.builds.map((b) => b.id),
  });
  await writeJson(paths.mods, options.mods);

  for (const entry of options.builds) {
    await writeJson(path.join(paths.buildsDir, `${entry.id}.json`), entry);
  }

  const manifest: KnowledgeManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      wfcd: "https://api.warframestat.us",
      wiki: "https://wiki.warframe.com",
      overframe: "https://overframe.gg",
      official: options.previous?.sources.official ?? "https://www.warframe.com",
    },
    counts: {
      catalogItems: options.catalog.length,
      wikiDigests: options.previous?.counts.wikiDigests ?? 0,
      buildEntries: options.builds.filter((b) => b.builds.length > 0).length,
      modsIndexed: options.mods.length,
      officialDigests: options.previous?.counts.officialDigests ?? 0,
      mechanicsDigests: options.previous?.counts.mechanicsDigests ?? 0,
    },
    notes: options.notes,
    overframeStatus: options.overframeStatus,
  };
  await writeJson(paths.manifest, manifest);
  return manifest;
}
