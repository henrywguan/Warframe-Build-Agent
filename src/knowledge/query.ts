import { resolveRepoRoot } from "./repo-root.js";
import {
  loadCatalog,
  loadItemBuilds,
  loadManifest,
  loadMods,
  loadWikiDigest,
} from "./store.js";
import type { CatalogItem } from "./types.js";

const ONLINE_SEARCH_CONFIRMATION_REQUIRED = "ONLINE_SEARCH_CONFIRMATION_REQUIRED";
const LOCAL_BUILDS_AVAILABLE = "LOCAL_BUILDS_AVAILABLE";

function formatOnlineSearchConfirmation(itemNames: string[]): string {
  const items =
    itemNames.length === 0
      ? "this item"
      : itemNames.length === 1
        ? itemNames[0]!
        : itemNames.slice(0, 3).join(", ");
  return [
    `${ONLINE_SEARCH_CONFIRMATION_REQUIRED} for ${items}`,
    `Local pack has catalog/wiki facts for comparison, but no cached Overframe community builds for ${items}.`,
    "Search online (Overframe, YouTube, and other public build sources) for community comparisons?",
    "Reply **yes** to allow online search, or **no** to stay local + agent-calculated only.",
  ].join("\n");
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

  const withBuilds: string[] = [];
  const withoutBuilds: string[] = [];

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
      withBuilds.push(item.name);
      chunks.push(
        "",
        `### ${LOCAL_BUILDS_AVAILABLE}`,
        "### Overframe / imported community builds (local cache)",
        "Compare using these local builds first. Do not search online unless the player asks.",
      );
      for (const build of builds.builds) {
        chunks.push(
          `${build.rank}. ${build.name}${build.forma != null ? ` · ${build.forma} forma` : ""}${build.url ? ` · ${build.url}` : ""}`,
        );
        chunks.push(build.summary);
        if (build.mods?.length) chunks.push(`Mods: ${build.mods.join(", ")}`);
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

  if (withoutBuilds.length) {
    chunks.push(formatOnlineSearchConfirmation(withoutBuilds));
  } else if (withBuilds.length) {
    chunks.push(
      `${LOCAL_BUILDS_AVAILABLE}: local Overframe/import builds found for ${withBuilds.join(", ")}.`,
    );
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
