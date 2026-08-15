/** Map catalog item names → arsenal card slots (warframe / weapon / companion). */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type ArsenalSlotKind =
  | "warframe"
  | "primary"
  | "secondary"
  | "melee"
  | "companion"
  | "unknown";

export type CatalogRow = {
  id: string;
  name: string;
  kind: string;
  category?: string;
  type?: string;
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

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreName(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.startsWith(q) || q.startsWith(c)) return 80;
  if (c.includes(q) || q.includes(c)) return 60;
  const qTokens = new Set(q.split(" ").filter(Boolean));
  const cTokens = c.split(" ").filter(Boolean);
  let hit = 0;
  for (const t of cTokens) if (qTokens.has(t)) hit += 1;
  if (!hit) return 0;
  return Math.round((hit / Math.max(qTokens.size, cTokens.length)) * 50);
}

/** Common companions not always present as catalog weapons/frames. */
const COMPANION_HINTS = [
  "carrier",
  "dethcube",
  "shade",
  "wyrm",
  "diriga",
  "taxon",
  "oxylus",
  "helios",
  "djinn",
  "nautilus",
  "vizier",
  "hound",
  "kubrow",
  "kavat",
  "vulpaphyla",
  "predasite",
  "venari",
  "moa",
  "heliocor",
  "smeeta",
  "adarra",
  "sunika",
  "raksa",
  "sahasa",
  "chesa",
];

let catalogCache: CatalogRow[] | null = null;

export async function loadArsenalCatalog(): Promise<CatalogRow[]> {
  if (catalogCache) return catalogCache;
  const root = knowledgeRoot();
  if (!root) return [];
  try {
    const raw = JSON.parse(
      await readFile(path.join(root, "catalog", "items.json"), "utf8"),
    ) as CatalogRow[];
    catalogCache = Array.isArray(raw) ? raw : [];
    return catalogCache;
  } catch {
    return [];
  }
}

/** Test helper — inject catalog without disk. */
export function setArsenalCatalogForTests(rows: CatalogRow[] | null): void {
  catalogCache = rows;
}

export function classifyCompanionHint(name: string): boolean {
  const n = normalize(name);
  if (!n) return false;
  return COMPANION_HINTS.some((h) => n === h || n.includes(h) || h.includes(n));
}

export function slotFromCatalogRow(row: CatalogRow): ArsenalSlotKind {
  if (row.kind === "warframe") return "warframe";
  if (row.kind === "archwing") return "unknown";
  if (row.kind === "weapon") {
    const cat = (row.category || "").toLowerCase();
    if (cat === "primary" || cat === "arch-gun") return "primary";
    if (cat === "secondary") return "secondary";
    if (cat === "melee" || cat === "arch-melee") return "melee";
  }
  return "unknown";
}

export async function classifyItemName(
  rawName: string,
  catalog?: CatalogRow[],
): Promise<{
  slot: ArsenalSlotKind;
  matchedName: string;
  catalogId?: string;
  score: number;
}> {
  const name = rawName.trim();
  if (!name || /^unknown$/i.test(name)) {
    return { slot: "unknown", matchedName: name || "Unknown", score: 0 };
  }

  if (classifyCompanionHint(name)) {
    return { slot: "companion", matchedName: name, score: 70 };
  }

  const rows = catalog ?? (await loadArsenalCatalog());
  let best: { row: CatalogRow; score: number } | null = null;
  for (const row of rows) {
    const score = scoreName(name, row.name);
    if (!best || score > best.score) best = { row, score };
  }

  if (best && best.score >= 50) {
    return {
      slot: slotFromCatalogRow(best.row),
      matchedName: best.row.name,
      catalogId: best.row.id,
      score: best.score,
    };
  }

  // Soft heuristics when catalog miss
  if (/\b(prime|umbra)?\s*(frame)?$/i.test(name) && !/\b(soma|braton|latron)\b/i.test(name)) {
    // don't guess warframe from "prime" alone on weapons
  }
  return { slot: "unknown", matchedName: name, score: best?.score ?? 0 };
}
