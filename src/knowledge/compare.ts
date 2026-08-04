/**
 * Deterministic loadout ↔ local Overframe top-N build comparison.
 * Used by CLI, web tools, and offline (no-model) chat.
 */
import { OVERFRAME_TOP_BUILDS } from "./constants.js";
import { findCatalogMatches } from "./query.js";
import { resolveRepoRoot } from "./repo-root.js";
import { loadCatalog, loadItemBuilds, loadManifest } from "./store.js";
import type { ItemBuilds, OverframeBuild, ParsedLoadout } from "./types.js";

export type BuildDiff = {
  rank: number;
  name: string;
  url?: string;
  forma?: number;
  sharedMods: string[];
  missingMods: string[];
  extraMods: string[];
  sharedArcanes: string[];
  missingArcanes: string[];
  extraArcanes: string[];
  /** 0–100 similarity on mods+arcanes (Jaccard-ish). */
  score: number;
};

export type LoadoutCompareResult = {
  ok: boolean;
  itemId?: string;
  itemName: string;
  matchedCatalogName?: string;
  playerMods: string[];
  playerArcanes: string[];
  buildsCompared: number;
  diffs: BuildDiff[];
  bestRank?: number;
  message: string;
  marker?: "LOCAL_BUILDS_AVAILABLE" | "ONLINE_SEARCH_CONFIRMATION_REQUIRED";
};

function normalizeName(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function uniqueNormalized(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = normalizeName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name.trim());
  }
  return out;
}

function setDiff(player: string[], reference: string[]) {
  const playerKeys = new Map(player.map((n) => [normalizeName(n), n]));
  const refKeys = new Map(reference.map((n) => [normalizeName(n), n]));
  const shared: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];
  for (const [key, name] of refKeys) {
    if (playerKeys.has(key)) shared.push(name);
    else missing.push(name);
  }
  for (const [key, name] of playerKeys) {
    if (!refKeys.has(key)) extra.push(name);
  }
  return { shared, missing, extra };
}

function similarityScore(
  sharedMods: number,
  missingMods: number,
  extraMods: number,
  sharedArcanes: number,
  missingArcanes: number,
  extraArcanes: number,
): number {
  const unionMods = sharedMods + missingMods + extraMods;
  const unionArcanes = sharedArcanes + missingArcanes + extraArcanes;
  const modScore = unionMods === 0 ? 1 : sharedMods / unionMods;
  const arcaneScore = unionArcanes === 0 ? 1 : sharedArcanes / unionArcanes;
  // Mods dominate; arcanes are a smaller slot count.
  return Math.round((modScore * 0.8 + arcaneScore * 0.2) * 100);
}

export function diffAgainstBuild(
  loadout: ParsedLoadout,
  build: OverframeBuild,
): BuildDiff {
  const playerMods = uniqueNormalized(loadout.mods);
  const playerArcanes = uniqueNormalized(loadout.arcanes);
  const buildMods = uniqueNormalized(build.mods ?? []);
  const buildArcanes = uniqueNormalized(build.arcanes ?? []);
  const mods = setDiff(playerMods, buildMods);
  const arcanes = setDiff(playerArcanes, buildArcanes);
  return {
    rank: build.rank,
    name: build.name,
    url: build.url,
    forma: build.forma,
    sharedMods: mods.shared,
    missingMods: mods.missing,
    extraMods: mods.extra,
    sharedArcanes: arcanes.shared,
    missingArcanes: arcanes.missing,
    extraArcanes: arcanes.extra,
    score: similarityScore(
      mods.shared.length,
      mods.missing.length,
      mods.extra.length,
      arcanes.shared.length,
      arcanes.missing.length,
      arcanes.extra.length,
    ),
  };
}

export function formatCompareResult(result: LoadoutCompareResult): string {
  const lines: string[] = [];
  if (!result.ok) {
    lines.push(result.message);
    if (result.marker) lines.push("", result.marker);
    return lines.join("\n").trim();
  }

  lines.push(
    `Loadout compare for ${result.matchedCatalogName || result.itemName}`,
    `Player mods (${result.playerMods.length}): ${result.playerMods.join(", ") || "(none)"}`,
    `Player arcanes (${result.playerArcanes.length}): ${result.playerArcanes.join(", ") || "(none)"}`,
    "",
    `${result.marker ?? "LOCAL_BUILDS_AVAILABLE"}: compared against top ${result.buildsCompared} local Overframe/import builds.`,
  );
  if (result.bestRank != null) {
    lines.push(`Closest match: rank #${result.bestRank}.`);
  }
  lines.push("");

  for (const diff of result.diffs) {
    lines.push(
      `### #${diff.rank} ${diff.name} — ${diff.score}% overlap${diff.forma != null ? ` · ${diff.forma} forma` : ""}`,
    );
    if (diff.url) lines.push(diff.url);
    lines.push(
      `Shared mods (${diff.sharedMods.length}): ${diff.sharedMods.join(", ") || "—"}`,
    );
    lines.push(
      `Missing vs this build (${diff.missingMods.length}): ${diff.missingMods.join(", ") || "—"}`,
    );
    lines.push(
      `Extra on your loadout (${diff.extraMods.length}): ${diff.extraMods.join(", ") || "—"}`,
    );
    lines.push(
      `Shared arcanes: ${diff.sharedArcanes.join(", ") || "—"}`,
      `Missing arcanes: ${diff.missingArcanes.join(", ") || "—"}`,
      `Extra arcanes: ${diff.extraArcanes.join(", ") || "—"}`,
      "",
    );
  }

  lines.push(result.message);
  return lines.join("\n").trim();
}

export async function compareLoadoutToTopBuilds(
  loadout: ParsedLoadout,
  options?: { repoRoot?: string; topN?: number },
): Promise<LoadoutCompareResult> {
  const repoRoot = options?.repoRoot ?? resolveRepoRoot();
  const topN = Math.max(1, Math.min(OVERFRAME_TOP_BUILDS, options?.topN ?? OVERFRAME_TOP_BUILDS));
  const itemName = loadout.itemName?.trim();
  if (!itemName) {
    return {
      ok: false,
      itemName: "",
      playerMods: uniqueNormalized(loadout.mods),
      playerArcanes: uniqueNormalized(loadout.arcanes),
      buildsCompared: 0,
      diffs: [],
      message: "Missing item name — cannot compare loadout.",
    };
  }

  const manifest = await loadManifest(repoRoot);
  if (!manifest) {
    return {
      ok: false,
      itemName,
      playerMods: uniqueNormalized(loadout.mods),
      playerArcanes: uniqueNormalized(loadout.arcanes),
      buildsCompared: 0,
      diffs: [],
      message: "Local knowledge pack not found. Run: npm run knowledge -- pull",
    };
  }

  const catalog = await loadCatalog(repoRoot);
  const matches = findCatalogMatches(catalog, itemName, 3);
  const match = matches[0];
  if (!match) {
    return {
      ok: false,
      itemName,
      playerMods: uniqueNormalized(loadout.mods),
      playerArcanes: uniqueNormalized(loadout.arcanes),
      buildsCompared: 0,
      diffs: [],
      message: `No local catalog match for “${itemName}”.`,
      marker: "ONLINE_SEARCH_CONFIRMATION_REQUIRED",
    };
  }

  const entry: ItemBuilds | null = await loadItemBuilds(match.id, repoRoot);
  const builds = (entry?.builds ?? []).slice(0, topN);
  if (!builds.length) {
    return {
      ok: false,
      itemId: match.id,
      itemName,
      matchedCatalogName: match.name,
      playerMods: uniqueNormalized(loadout.mods),
      playerArcanes: uniqueNormalized(loadout.arcanes),
      buildsCompared: 0,
      diffs: [],
      message: `No cached Overframe builds for ${match.name}. Crawl/import builds first, or confirm online search.`,
      marker: "ONLINE_SEARCH_CONFIRMATION_REQUIRED",
    };
  }

  const diffs = builds
    .map((build) => diffAgainstBuild(loadout, build))
    .sort((a, b) => b.score - a.score || a.rank - b.rank);
  const best = diffs[0];

  return {
    ok: true,
    itemId: match.id,
    itemName,
    matchedCatalogName: match.name,
    playerMods: uniqueNormalized(loadout.mods),
    playerArcanes: uniqueNormalized(loadout.arcanes),
    buildsCompared: builds.length,
    diffs,
    bestRank: best?.rank,
    marker: "LOCAL_BUILDS_AVAILABLE",
    message:
      best && best.score >= 70
        ? `Your loadout is closest to local Overframe #${best.rank} (${best.score}% overlap). Review missing mods above if you want to align further.`
        : `Compared against ${builds.length} local top builds. Closest is #${best?.rank ?? "?"} at ${best?.score ?? 0}% — notable mod gaps remain.`,
  };
}
