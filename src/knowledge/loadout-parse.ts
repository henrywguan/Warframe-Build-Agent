/**
 * Parse a Warframe arsenal / modding screenshot OCR dump into a structured loadout.
 * Matches against local catalog + mod index — no network required.
 */
import { findCatalogMatches } from "./query.js";
import { resolveRepoRoot } from "./repo-root.js";
import { loadCatalog, loadMods } from "./store.js";
import type { CatalogItem, ModDigest, ParsedLoadout } from "./types.js";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreName(query: string, name: string): number {
  const q = normalize(query);
  const n = normalize(name);
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (q.startsWith(n) && n.length >= 4) return 70;
  if (n.includes(q) || q.includes(n)) return 60;
  const qTokens = q.split(" ");
  const nTokens = new Set(n.split(" "));
  return qTokens.filter((t) => nTokens.has(t)).length * 15;
}

/** Split OCR text into candidate name lines / tokens. */
export function tokenizeOcrText(raw: string): string[] {
  return raw
    .split(/\r?\n|[|•·]| {2,}/)
    .map((line) => line.replace(/[^\w\s'/-]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3 && line.length <= 48);
}

function findBestNames(
  candidates: string[],
  dictionary: Array<{ name: string }>,
  minScore: number,
  limit: number,
): string[] {
  const hits = new Map<string, { name: string; score: number }>();
  for (const candidate of candidates) {
    for (const entry of dictionary) {
      const score = scoreName(candidate, entry.name);
      if (score < minScore) continue;
      const key = normalize(entry.name);
      const prev = hits.get(key);
      if (!prev || score > prev.score) hits.set(key, { name: entry.name, score });
    }
  }
  return [...hits.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((row) => row.name);
}

export function parseLoadoutFromText(
  rawText: string,
  options: {
    catalog: CatalogItem[];
    mods: ModDigest[];
    hintedItemName?: string;
  },
): ParsedLoadout {
  const notes: string[] = [];
  const candidates = tokenizeOcrText(rawText);
  const catalog = options.catalog;
  const modDict = options.mods.length
    ? options.mods
    : [
        // Fallback empty — still allow arcane/mod-looking lines later
      ];

  let itemName = options.hintedItemName?.trim() || "";
  if (!itemName) {
    const catalogHits = findCatalogMatches(catalog, candidates.join(" "), 5);
    // Prefer a candidate line that scores highly against a catalog item.
    let best: { name: string; score: number } | null = null;
    for (const candidate of candidates) {
      for (const item of catalog) {
        const score = scoreName(candidate, item.name);
        if (score < 60) continue;
        if (!best || score > best.score) best = { name: item.name, score };
      }
    }
    if (best) {
      itemName = best.name;
    } else if (catalogHits[0]) {
      itemName = catalogHits[0].name;
      notes.push("Item name inferred from overall OCR text (lower confidence).");
    }
  }

  const knownMods = modDict.filter((m) => m.kind === "mod");
  const knownArcanes = modDict.filter((m) => m.kind === "arcane");
  let mods = findBestNames(candidates, knownMods.length ? knownMods : [], 60, 16);
  let arcanes = findBestNames(candidates, knownArcanes.length ? knownArcanes : [], 60, 6);

  // Heuristic: lines that look like Arcane X when index is sparse.
  if (!arcanes.length) {
    arcanes = candidates.filter((line) => /^arcane\b/i.test(line)).slice(0, 6);
  }

  // If mod index is empty, still surface high-confidence catalog-adjacent tokens poorly —
  // prefer returning empty mods over inventing names.
  if (!knownMods.length && !mods.length) {
    notes.push(
      "Mod index empty or sparse — OCR matched few known mod names. Re-crawl Overframe or paste mod names.",
    );
  }

  const confidence: ParsedLoadout["confidence"] =
    itemName && (mods.length >= 4 || arcanes.length >= 1)
      ? mods.length >= 6
        ? "high"
        : "medium"
      : itemName
        ? "low"
        : "low";

  if (!itemName) {
    notes.push("Could not identify a Warframe/weapon name from the screenshot text.");
  }

  return {
    itemName: itemName || "Unknown",
    mods,
    arcanes,
    confidence,
    rawText: rawText.slice(0, 4000),
    notes,
  };
}

export async function parseLoadoutFromTextFile(
  rawText: string,
  options?: { repoRoot?: string; hintedItemName?: string },
): Promise<ParsedLoadout> {
  const repoRoot = options?.repoRoot ?? resolveRepoRoot();
  const catalog = await loadCatalog(repoRoot);
  const mods = await loadMods(repoRoot);
  return parseLoadoutFromText(rawText, {
    catalog,
    mods,
    hintedItemName: options?.hintedItemName,
  });
}
