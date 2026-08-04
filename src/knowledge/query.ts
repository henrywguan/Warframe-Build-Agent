import { resolveRepoRoot } from "./repo-root.js";
import {
  loadArcaneDigests,
  loadCatalog,
  loadItemBuilds,
  loadManifest,
  loadMechanicsDigests,
  loadMods,
  loadOfficialDigests,
  loadWikiDigest,
} from "./store.js";
import type { ArcaneDigest, CatalogItem, MechanicsDigest } from "./types.js";

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

/** Score a mechanics digest against a free-text query (title + aliases + summary). */
export function scoreMechanicsDigest(query: string, digest: MechanicsDigest): number {
  const labels = [
    digest.title,
    digest.id.replace(/-/g, " "),
    digest.summary,
    ...digest.aliases,
  ];
  let best = Math.max(0, ...labels.map((label) => scoreName(query, label)));

  // Also score each query token against short aliases ("viral", "rad", "sp").
  const qTokens = normalize(query)
    .split(" ")
    .filter((t) => t.length >= 2);
  const stop = new Set([
    "the",
    "and",
    "or",
    "vs",
    "for",
    "with",
    "into",
    "from",
    "that",
    "this",
    "what",
    "when",
    "how",
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
  for (const token of qTokens) {
    if (stop.has(token)) continue;
    for (const label of labels) {
      const n = normalize(label);
      if (!n) continue;
      if (n === token || n.split(" ").includes(token)) {
        tokenScore += token.length <= 3 ? 55 : 70;
        break;
      }
      // "radiation".startsWith("rad") for short player shorthand
      if (token.length >= 3 && n.split(" ").some((part) => part.startsWith(token))) {
        tokenScore += 45;
        break;
      }
    }
  }

  best = Math.max(best, Math.min(100, tokenScore));
  return best;
}

export function findMechanicsMatches(
  digests: MechanicsDigest[],
  query: string,
  limit = 6,
): MechanicsDigest[] {
  return digests
    .map((digest) => ({ digest, score: scoreMechanicsDigest(query, digest) }))
    .filter((row) => row.score >= 45)
    .sort((a, b) => b.score - a.score || a.digest.title.localeCompare(b.digest.title))
    .slice(0, limit)
    .map((row) => row.digest);
}

/** Score an arcane digest against a free-text query. */
export function scoreArcaneDigest(query: string, digest: ArcaneDigest): number {
  return scoreMechanicsDigest(query, {
    id: digest.id,
    title: digest.title,
    kind: "modding",
    aliases: [...digest.aliases, digest.slot, `${digest.slot} arcane`, "arcane"],
    summary: digest.summary,
    pageUrl: digest.pageUrl,
    extract: digest.extract,
    fetchedAt: digest.fetchedAt,
    source: "wiki",
  });
}

export function findArcaneMatches(
  digests: ArcaneDigest[],
  query: string,
  limit = 8,
): ArcaneDigest[] {
  const q = normalize(query);
  // Broad "arcanes" / "primary arcanes" list queries.
  const listMode = /^(arcane|arcanes)s?$/.test(q) || /\barcanes?\b/.test(q);
  return digests
    .map((digest) => {
      let score = scoreArcaneDigest(query, digest);
      if (listMode && q.includes(digest.slot) && digest.slot !== "other") score = Math.max(score, 70);
      if (listMode && (q === "arcane" || q === "arcanes")) score = Math.max(score, 50);
      return { digest, score };
    })
    .filter((row) => row.score >= 45)
    .sort((a, b) => b.score - a.score || a.digest.title.localeCompare(b.digest.title))
    .slice(0, limit)
    .map((row) => row.digest);
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

function formatMechanicsChunk(digest: MechanicsDigest, extractLimit = 6000): string[] {
  const lines = [
    `## ${digest.title} (${digest.kind})`,
    digest.summary,
    digest.pageUrl,
    "",
    "### Mechanics digest",
    digest.extract.slice(0, extractLimit),
  ];
  if (digest.sections) {
    for (const [name, body] of Object.entries(digest.sections).slice(0, 4)) {
      lines.push("", `### ${name}`, body.slice(0, 2500));
    }
  }
  lines.push("");
  return lines;
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
      "Or: npm run knowledge -- pull-mechanics | pull-arcanes",
      "Optional: npm run knowledge -- pull --import-builds ./builds.json",
    ].join("\n");
  }

  const catalog = await loadCatalog(repoRoot);
  const matches = findCatalogMatches(catalog, query, options?.limit ?? 5);
  const mechanics = await loadMechanicsDigests(repoRoot);
  const mechanicsHits = findMechanicsMatches(mechanics, query, 8);
  const arcanes = await loadArcaneDigests(repoRoot);
  const arcaneHits = findArcaneMatches(arcanes, query, 8);

  if (!matches.length && !mechanicsHits.length && !arcaneHits.length) {
    return [
      `No local catalog, mechanics, or arcane match for “${query}”.`,
      `Pack has ${manifest.counts.catalogItems} items, ${manifest.counts.mechanicsDigests ?? 0} mechanics digests, ${manifest.counts.arcaneDigests ?? 0} arcane digests (generated ${manifest.generatedAt}).`,
      "Try: npm run knowledge -- pull-mechanics && npm run knowledge -- pull-arcanes",
    ].join("\n");
  }

  const chunks: string[] = [
    `Local knowledge pack (${manifest.generatedAt})`,
    `Overframe: ${manifest.overframeStatus} · wiki: ${manifest.counts.wikiDigests} · mechanics: ${manifest.counts.mechanicsDigests ?? 0} · arcanes: ${manifest.counts.arcaneDigests ?? 0} · catalog: ${manifest.counts.catalogItems}`,
    "",
  ];

  if (arcaneHits.length) {
    chunks.push("# Arcane digests", "");
    for (const digest of arcaneHits) {
      chunks.push(
        `## ${digest.title} (${digest.slot})`,
        digest.summary,
        digest.pageUrl,
        "",
        "### Arcane digest",
        digest.extract.slice(0, 5000),
        "",
      );
    }
  }

  if (mechanicsHits.length) {
    chunks.push("# Mechanics / resource digests", "");
    for (const digest of mechanicsHits) {
      chunks.push(...formatMechanicsChunk(digest));
    }
  }

  const withBuilds: string[] = [];
  const withoutBuilds: string[] = [];

  if (matches.length) {
    chunks.push("# Item digests", "");
  }

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
        if (build.arcanes?.length) chunks.push(`Arcanes: ${build.arcanes.join(", ")}`);
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

  const official = await loadOfficialDigests(repoRoot);
  const officialHits = official
    .map((digest) => ({
      digest,
      score: Math.max(scoreName(query, digest.title), scoreName(query, digest.extract.slice(0, 200))),
    }))
    .filter((row) => row.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (officialHits.length) {
    chunks.push("## Official warframe.com digests");
    for (const { digest } of officialHits) {
      chunks.push(
        `### ${digest.title} (${digest.kind})`,
        digest.pageUrl,
        digest.extract.slice(0, 2500),
        "",
      );
    }
  }

  return chunks.join("\n").trim();
}
