import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

interface Manifest {
  generatedAt: string;
  overframeStatus: string;
  counts: {
    catalogItems: number;
    wikiDigests: number;
    buildEntries: number;
  };
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

export async function lookupLocalKnowledge(query: string): Promise<string> {
  const root = knowledgeRoot();
  if (!root) {
    return [
      "Local knowledge pack not found.",
      "From repo root run: npm run knowledge -- pull",
      "If Overframe is Cloudflare-blocked, also use --import-builds <file>.",
    ].join("\n");
  }

  const manifest = await readJson<Manifest>(path.join(root, "manifest.json"));
  const catalog =
    (await readJson<CatalogItem[]>(path.join(root, "catalog", "items.json"))) || [];
  if (!manifest || !catalog.length) {
    return "Local knowledge pack is empty. Run npm run knowledge -- pull";
  }

  const matches = catalog
    .map((item) => ({ item, score: scoreName(query, item.name) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, 5)
    .map((row) => row.item);

  if (!matches.length) {
    return `No local catalog match for “${query}”. Pack has ${manifest.counts.catalogItems} items.`;
  }

  const chunks: string[] = [
    `Local knowledge pack (${manifest.generatedAt})`,
    `Overframe: ${manifest.overframeStatus} · wiki: ${manifest.counts.wikiDigests} · catalog: ${manifest.counts.catalogItems}`,
    "",
  ];

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
      chunks.push("", "### Top builds (local)");
      for (const build of builds.builds) {
        chunks.push(
          `${build.rank}. ${build.name}${build.forma != null ? ` · ${build.forma} forma` : ""}`,
        );
        chunks.push(build.summary);
        if (build.mods?.length) chunks.push(`Mods: ${build.mods.join(", ")}`);
        if (build.url) chunks.push(build.url);
      }
    } else if (manifest.overframeStatus === "blocked") {
      chunks.push(
        "",
        "### Top builds unavailable",
        "Overframe was blocked during pull (Cloudflare). Re-run knowledge pull where overframe.gg is reachable, or import builds JSON.",
      );
    } else if (builds?.error) {
      chunks.push("", `### Top builds unavailable: ${builds.error}`);
    }
    chunks.push("");
  }

  return chunks.join("\n").trim();
}
