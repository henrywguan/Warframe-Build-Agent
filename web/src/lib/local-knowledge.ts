import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  LOCAL_BUILDS_AVAILABLE_MARKER,
  formatOnlineSearchConfirmation,
} from "@/lib/source-policy";

interface Manifest {
  generatedAt: string;
  overframeStatus: string;
  counts: {
    catalogItems: number;
    wikiDigests: number;
    buildEntries: number;
    mechanicsDigests?: number;
  };
}

interface MechanicsDigest {
  id: string;
  title: string;
  kind: string;
  aliases?: string[];
  summary?: string;
  pageUrl?: string;
  extract: string;
  sections?: Record<string, string>;
}

interface CatalogItem {
  id: string;
  name: string;
  kind: string;
  category: string;
  type?: string;
  description?: string;
  stats: Record<string, unknown>;
  abilities?: Array<{ name?: string; description?: string }>;
}

interface WikiDigest {
  extract: string;
  sections?: Record<string, string>;
}

interface ItemBuilds {
  builds: Array<{
    rank: number;
    name: string;
    summary: string;
    mods?: string[];
    arcanes?: string[];
    url?: string;
    forma?: number;
  }>;
  error?: string;
}

function knowledgeRoot(): string | null {
  const candidates = [
    path.join(process.cwd(), "data", "knowledge"),
    path.join(process.cwd(), "..", "data", "knowledge"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "manifest.json"))) return candidate;
  }
  return null;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreName(query: string, name: string): number {
  const q = normalize(query);
  const n = normalize(name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.includes(q)) return 60;
  const qTokens = q.split(" ");
  const nTokens = new Set(n.split(" "));
  return qTokens.filter((t) => nTokens.has(t)).length * 15;
}

function scoreMechanics(query: string, digest: MechanicsDigest): number {
  const labels = [
    digest.title,
    digest.id.replace(/-/g, " "),
    digest.summary || "",
    ...(digest.aliases || []),
  ];
  const best = Math.max(0, ...labels.map((label) => scoreName(query, label)));
  const stop = new Set([
    "the",
    "and",
    "or",
    "vs",
    "for",
    "with",
    "best",
    "better",
    "stack",
    "should",
    "would",
    "does",
    "is",
    "it",
    "to",
    "a",
    "an",
    "of",
    "on",
    "in",
  ]);
  let tokenScore = 0;
  for (const token of normalize(query)
    .split(" ")
    .filter((t) => t.length >= 2)) {
    if (stop.has(token)) continue;
    for (const label of labels) {
      const n = normalize(label);
      if (!n) continue;
      if (n === token || n.split(" ").includes(token)) {
        tokenScore += token.length <= 3 ? 55 : 70;
        break;
      }
      if (token.length >= 3 && n.split(" ").some((part) => part.startsWith(token))) {
        tokenScore += 45;
        break;
      }
    }
  }
  return Math.max(best, Math.min(100, tokenScore));
}

export type LocalBuildLookup = {
  root: string | null;
  matches: CatalogItem[];
  withBuilds: string[];
  withoutBuilds: string[];
};

/** Inspect whether matched catalog items have cached Overframe/import builds. */
export async function inspectLocalBuilds(query: string): Promise<LocalBuildLookup> {
  const root = knowledgeRoot();
  if (!root) {
    return { root: null, matches: [], withBuilds: [], withoutBuilds: [] };
  }
  const catalog =
    (await readJson<CatalogItem[]>(path.join(root, "catalog", "items.json"))) || [];
  const matches = catalog
    .map((item) => ({ item, score: scoreName(query, item.name) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, 5)
    .map((row) => row.item);

  const withBuilds: string[] = [];
  const withoutBuilds: string[] = [];
  for (const item of matches) {
    const builds = await readJson<ItemBuilds>(
      path.join(root, "builds", "by-item", `${item.id}.json`),
    );
    if (builds?.builds?.length) withBuilds.push(item.name);
    else withoutBuilds.push(item.name);
  }
  return { root, matches, withBuilds, withoutBuilds };
}

export async function lookupLocalKnowledge(query: string): Promise<string> {
  const root = knowledgeRoot();
  if (!root) {
    return [
      "Local knowledge pack not found.",
      "From repo root run: npm run knowledge -- pull",
      "If Overframe is Cloudflare-blocked, also use --import-builds <file>.",
      "",
      formatOnlineSearchConfirmation([]),
    ].join("\n");
  }

  const manifest = await readJson<Manifest>(path.join(root, "manifest.json"));
  const catalog =
    (await readJson<CatalogItem[]>(path.join(root, "catalog", "items.json"))) || [];
  if (!manifest || !catalog.length) {
    return [
      "Local knowledge pack is empty. Run npm run knowledge -- pull",
      "",
      formatOnlineSearchConfirmation([]),
    ].join("\n");
  }

  const matches = catalog
    .map((item) => ({ item, score: scoreName(query, item.name) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, 5)
    .map((row) => row.item);

  const mechanicsIndex = await readJson<{ ids?: string[] }>(
    path.join(root, "mechanics", "index.json"),
  );
  const mechanics: MechanicsDigest[] = [];
  for (const id of mechanicsIndex?.ids ?? []) {
    const digest = await readJson<MechanicsDigest>(
      path.join(root, "mechanics", "digests", `${id}.json`),
    );
    if (digest) mechanics.push(digest);
  }
  const mechanicsHits = mechanics
    .map((digest) => ({ digest, score: scoreMechanics(query, digest) }))
    .filter((row) => row.score >= 45)
    .sort((a, b) => b.score - a.score || a.digest.title.localeCompare(b.digest.title))
    .slice(0, 8)
    .map((row) => row.digest);

  if (!matches.length && !mechanicsHits.length) {
    return [
      `No local catalog or mechanics match for “${query}”. Pack has ${manifest.counts.catalogItems} items, ${manifest.counts.mechanicsDigests ?? 0} mechanics digests.`,
      "Run: npm run knowledge -- pull-mechanics",
      "",
      formatOnlineSearchConfirmation([query]),
    ].join("\n");
  }

  const chunks: string[] = [
    `Local knowledge pack (${manifest.generatedAt})`,
    `Overframe: ${manifest.overframeStatus} · wiki: ${manifest.counts.wikiDigests} · mechanics: ${manifest.counts.mechanicsDigests ?? 0} · catalog: ${manifest.counts.catalogItems}`,
    "",
  ];

  if (mechanicsHits.length) {
    chunks.push("# Mechanics / resource digests", "");
    for (const digest of mechanicsHits) {
      chunks.push(`## ${digest.title} (${digest.kind})`);
      if (digest.summary) chunks.push(digest.summary);
      if (digest.pageUrl) chunks.push(digest.pageUrl);
      chunks.push("", "### Mechanics digest", digest.extract.slice(0, 6000), "");
    }
  }

  const withBuilds: string[] = [];
  const withoutBuilds: string[] = [];

  if (matches.length) chunks.push("# Item digests", "");

  for (const item of matches) {
    chunks.push(`## ${item.name} (${item.kind})`);
    if (item.description) chunks.push(item.description);
    chunks.push(`Category: ${item.category}${item.type ? ` / ${item.type}` : ""}`);
    chunks.push(`Stats: ${JSON.stringify(item.stats)}`);

    const wiki = await readJson<WikiDigest>(
      path.join(root, "wiki", "digests", `${item.id}.json`),
    );
    if (wiki?.extract) {
      chunks.push("", "### Wiki digest", wiki.extract);
      if (wiki.sections?.abilities) {
        chunks.push("", "### Abilities", wiki.sections.abilities);
      }
    }

    const builds = await readJson<ItemBuilds>(
      path.join(root, "builds", "by-item", `${item.id}.json`),
    );
    if (builds?.builds?.length) {
      withBuilds.push(item.name);
      chunks.push(
        "",
        `### ${LOCAL_BUILDS_AVAILABLE_MARKER}`,
        "### Overframe / imported community builds (local cache)",
        "Compare using these local builds first. Do not search online unless the player asks to widen the comparison.",
      );
      for (const build of builds.builds) {
        chunks.push(
          `${build.rank}. ${build.name}${build.forma != null ? ` · ${build.forma} forma` : ""}`,
        );
        chunks.push(build.summary);
        if (build.mods?.length) chunks.push(`Mods: ${build.mods.join(", ")}`);
        if (build.arcanes?.length) chunks.push(`Arcanes: ${build.arcanes.join(", ")}`);
        if (build.url) chunks.push(build.url);
      }
    } else {
      withoutBuilds.push(item.name);
      chunks.push(
        "",
        "### Overframe builds not in local cache for this item",
        builds?.error
          ? `Overframe unavailable: ${builds.error}`
          : "No cached community builds in the local pack for this item.",
      );
    }
    chunks.push("");
  }

  if (withoutBuilds.length && !withBuilds.length) {
    chunks.push(formatOnlineSearchConfirmation(withoutBuilds));
  } else if (withoutBuilds.length) {
    chunks.push(
      formatOnlineSearchConfirmation(withoutBuilds),
      "(Some matched items did have local builds above — prefer those for comparison first.)",
    );
  } else {
    chunks.push(
      `${LOCAL_BUILDS_AVAILABLE_MARKER}: local Overframe/import builds found for ${withBuilds.join(", ")}. Compare from local data; do not prompt for online search unless the player asks.`,
    );
  }

  return chunks.join("\n").trim();
}
