import { resolveRepoRoot } from "./repo-root.js";
import {
  loadCatalog,
  loadItemBuilds,
  loadManifest,
  loadMods,
  loadWikiDigest,
} from "./store.js";
import type { CatalogItem } from "./types.js";

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
  const overlap = qTokens.filter((t) => nTokens.has(t)).length;
  return overlap * 15;
}

export function findCatalogMatches(
  catalog: CatalogItem[],
  query: string,
  limit = 8,
): CatalogItem[] {
  return catalog
    .map((item) => ({ item, score: scoreName(query, item.name) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((row) => row.item);
}

export async function lookupLocalKnowledge(
  query: string,
  options?: { repoRoot?: string; limit?: number },
): Promise<string> {
  const repoRoot = options?.repoRoot ?? resolveRepoRoot();
  const manifest = await loadManifest(repoRoot);
  if (!manifest) {
    return [
      "Local knowledge pack not found.",
      "Run: npm run knowledge -- pull",
      "Optional: npm run knowledge -- pull --import-builds ./builds.json",
    ].join("\n");
  }

  const catalog = await loadCatalog(repoRoot);
  const matches = findCatalogMatches(catalog, query, options?.limit ?? 5);
  if (!matches.length) {
    return `No local catalog match for “${query}”. Pack has ${manifest.counts.catalogItems} items (generated ${manifest.generatedAt}).`;
  }

  const chunks: string[] = [
    `Local knowledge pack (${manifest.generatedAt})`,
    `Overframe builds: ${manifest.overframeStatus} · wiki digests: ${manifest.counts.wikiDigests} · catalog: ${manifest.counts.catalogItems}`,
    "",
  ];

  for (const item of matches) {
    chunks.push(`## ${item.name} (${item.kind})`);
    if (item.description) chunks.push(item.description);
    chunks.push(`Category: ${item.category}${item.type ? ` / ${item.type}` : ""}`);
    chunks.push(`Stats: ${JSON.stringify(item.stats)}`);

    const wiki = await loadWikiDigest(item.id, repoRoot);
    if (wiki?.extract) {
      chunks.push("", "### Wiki digest", wiki.extract);
      if (wiki.sections?.abilities) {
        chunks.push("", "### Abilities", wiki.sections.abilities);
      }
    }

    const builds = await loadItemBuilds(item.id, repoRoot);
    if (builds?.builds?.length) {
      chunks.push("", "### Top builds (local)");
      for (const build of builds.builds) {
        chunks.push(
          `${build.rank}. ${build.name}${build.forma != null ? ` · ${build.forma} forma` : ""}${build.url ? ` · ${build.url}` : ""}`,
        );
        chunks.push(build.summary);
        if (build.mods?.length) chunks.push(`Mods: ${build.mods.join(", ")}`);
      }
    } else if (builds?.error) {
      chunks.push("", `### Top builds unavailable: ${builds.error}`);
    } else if (manifest.overframeStatus === "blocked") {
      chunks.push(
        "",
        "### Top builds unavailable",
        "Overframe was blocked during pull (Cloudflare). Re-run knowledge pull where overframe.gg is reachable, or --import-builds.",
      );
    }
    chunks.push("");
  }

  // Optional mod lookup if query looks like a mod name
  const mods = await loadMods(repoRoot);
  const modHits = mods
    .map((mod) => ({ mod, score: scoreName(query, mod.name) }))
    .filter((row) => row.score >= 60)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (modHits.length) {
    chunks.push("## Mod digests");
    for (const { mod } of modHits) {
      chunks.push(`### ${mod.name}`, mod.extract || "(no extract)", "");
    }
  }

  return chunks.join("\n").trim();
}
