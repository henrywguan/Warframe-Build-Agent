import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  LOCAL_BUILDS_AVAILABLE_MARKER,
  ONLINE_SEARCH_CONFIRMATION_MARKER,
  formatOnlineSearchConfirmation,
} from "@/lib/source-policy";

export type ParsedLoadout = {
  itemName: string;
  mods: string[];
  arcanes: string[];
  confidence?: "high" | "medium" | "low";
  notes?: string[];
};

type CatalogItem = { id: string; name: string };
type ItemBuilds = {
  builds: Array<{
    rank: number;
    name: string;
    summary?: string;
    mods?: string[];
    arcanes?: string[];
    url?: string;
    forma?: number;
  }>;
};

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
  score: number;
};

export type LoadoutCompareResult = {
  ok: boolean;
  itemName: string;
  matchedCatalogName?: string;
  playerMods: string[];
  playerArcanes: string[];
  buildsCompared: number;
  diffs: BuildDiff[];
  bestRank?: number;
  message: string;
  marker?: string;
};

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

function uniqueNormalized(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = normalize(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name.trim());
  }
  return out;
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

function setDiff(player: string[], reference: string[]) {
  const playerKeys = new Map(player.map((n) => [normalize(n), n]));
  const refKeys = new Map(reference.map((n) => [normalize(n), n]));
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
  return Math.round((modScore * 0.8 + arcaneScore * 0.2) * 100);
}

export function formatLoadoutCompare(result: LoadoutCompareResult): string {
  if (!result.ok) {
    return [result.message, result.marker ? `\n${result.marker}` : ""]
      .join("")
      .trim();
  }
  const lines = [
    `Loadout compare for ${result.matchedCatalogName || result.itemName}`,
    `Player mods (${result.playerMods.length}): ${result.playerMods.join(", ") || "(none)"}`,
    `Player arcanes (${result.playerArcanes.length}): ${result.playerArcanes.join(", ") || "(none)"}`,
    "",
    `${result.marker ?? LOCAL_BUILDS_AVAILABLE_MARKER}: compared against top ${result.buildsCompared} local Overframe/import builds.`,
  ];
  if (result.bestRank != null) lines.push(`Closest match: rank #${result.bestRank}.`);
  lines.push("");
  for (const diff of result.diffs) {
    lines.push(
      `### #${diff.rank} ${diff.name} — ${diff.score}% overlap${diff.forma != null ? ` · ${diff.forma} forma` : ""}`,
    );
    if (diff.url) lines.push(diff.url);
    lines.push(`Shared mods: ${diff.sharedMods.join(", ") || "—"}`);
    lines.push(`Missing vs this build: ${diff.missingMods.join(", ") || "—"}`);
    lines.push(`Extra on your loadout: ${diff.extraMods.join(", ") || "—"}`);
    lines.push(`Shared arcanes: ${diff.sharedArcanes.join(", ") || "—"}`);
    lines.push(`Missing arcanes: ${diff.missingArcanes.join(", ") || "—"}`);
    lines.push(`Extra arcanes: ${diff.extraArcanes.join(", ") || "—"}`, "");
  }
  lines.push(result.message);
  return lines.join("\n").trim();
}

export async function compareLoadoutToTopBuilds(
  loadout: ParsedLoadout,
  topN = 3,
): Promise<LoadoutCompareResult> {
  const itemName = loadout.itemName?.trim();
  const playerMods = uniqueNormalized(loadout.mods);
  const playerArcanes = uniqueNormalized(loadout.arcanes);
  if (!itemName) {
    return {
      ok: false,
      itemName: "",
      playerMods,
      playerArcanes,
      buildsCompared: 0,
      diffs: [],
      message: "Missing item name — cannot compare loadout.",
    };
  }

  const root = knowledgeRoot();
  if (!root) {
    return {
      ok: false,
      itemName,
      playerMods,
      playerArcanes,
      buildsCompared: 0,
      diffs: [],
      message: "Local knowledge pack not found. Run: npm run knowledge -- pull",
      marker: ONLINE_SEARCH_CONFIRMATION_MARKER,
    };
  }

  const catalog =
    (await readJson<CatalogItem[]>(path.join(root, "catalog", "items.json"))) || [];
  const match = catalog
    .map((item) => ({ item, score: scoreName(itemName, item.name) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item;

  if (!match) {
    return {
      ok: false,
      itemName,
      playerMods,
      playerArcanes,
      buildsCompared: 0,
      diffs: [],
      message: `No local catalog match for “${itemName}”.`,
      marker: ONLINE_SEARCH_CONFIRMATION_MARKER,
    };
  }

  const entry = await readJson<ItemBuilds>(
    path.join(root, "builds", "by-item", `${match.id}.json`),
  );
  const builds = (entry?.builds ?? []).slice(0, Math.max(1, Math.min(3, topN)));
  if (!builds.length) {
    return {
      ok: false,
      itemName,
      matchedCatalogName: match.name,
      playerMods,
      playerArcanes,
      buildsCompared: 0,
      diffs: [],
      message: formatOnlineSearchConfirmation([match.name]),
      marker: ONLINE_SEARCH_CONFIRMATION_MARKER,
    };
  }

  const diffs = builds
    .map((build) => {
      const mods = setDiff(playerMods, uniqueNormalized(build.mods ?? []));
      const arcanes = setDiff(playerArcanes, uniqueNormalized(build.arcanes ?? []));
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
      } satisfies BuildDiff;
    })
    .sort((a, b) => b.score - a.score || a.rank - b.rank);

  const best = diffs[0];
  return {
    ok: true,
    itemName,
    matchedCatalogName: match.name,
    playerMods,
    playerArcanes,
    buildsCompared: builds.length,
    diffs,
    bestRank: best?.rank,
    marker: LOCAL_BUILDS_AVAILABLE_MARKER,
    message:
      best && best.score >= 70
        ? `Your loadout is closest to local Overframe #${best.rank} (${best.score}% overlap).`
        : `Compared against ${builds.length} local top builds. Closest is #${best?.rank ?? "?"} at ${best?.score ?? 0}%.`,
  };
}
