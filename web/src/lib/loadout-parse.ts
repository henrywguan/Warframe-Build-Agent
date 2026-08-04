import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedLoadout } from "@/lib/loadout-compare";

type CatalogItem = { id: string; name: string };
type ModDigest = { name: string; kind: "mod" | "arcane" };

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
  if (q.startsWith(n) && n.length >= 4) return 70;
  if (n.includes(q) || q.includes(n)) return 60;
  const qTokens = q.split(" ");
  const nTokens = new Set(n.split(" "));
  return qTokens.filter((t) => nTokens.has(t)).length * 15;
}

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
  catalog: CatalogItem[],
  mods: ModDigest[],
  hintedItemName?: string,
): ParsedLoadout {
  const notes: string[] = [];
  const candidates = tokenizeOcrText(rawText);
  let itemName = hintedItemName?.trim() || "";
  if (!itemName) {
    let best: { name: string; score: number } | null = null;
    for (const candidate of candidates) {
      for (const item of catalog) {
        const score = scoreName(candidate, item.name);
        if (score < 60) continue;
        if (!best || score > best.score) best = { name: item.name, score };
      }
    }
    itemName = best?.name || "";
  }

  const knownMods = mods.filter((m) => m.kind === "mod");
  const knownArcanes = mods.filter((m) => m.kind === "arcane");
  const parsedMods = findBestNames(candidates, knownMods, 60, 16);
  let arcanes = findBestNames(candidates, knownArcanes, 60, 6);
  if (!arcanes.length) {
    arcanes = candidates.filter((line) => /^arcane\b/i.test(line)).slice(0, 6);
  }

  if (!itemName) notes.push("Could not identify a Warframe/weapon name from the text.");
  if (!parsedMods.length) {
    notes.push("Few or no known mod names matched — crawl Overframe or paste mod names.");
  }

  const confidence: ParsedLoadout["confidence"] =
    itemName && parsedMods.length >= 6
      ? "high"
      : itemName && parsedMods.length >= 3
        ? "medium"
        : "low";

  return {
    itemName: itemName || "Unknown",
    mods: parsedMods,
    arcanes,
    confidence,
    notes,
  };
}

export async function parseLoadoutFromOcrText(
  rawText: string,
  hintedItemName?: string,
): Promise<ParsedLoadout> {
  const root = knowledgeRoot();
  const catalog =
    root
      ? (await readJson<CatalogItem[]>(path.join(root, "catalog", "items.json"))) || []
      : [];
  const mods =
    root
      ? (await readJson<ModDigest[]>(path.join(root, "mods", "index.json"))) || []
      : [];
  return parseLoadoutFromText(rawText, catalog, mods, hintedItemName);
}

/** Best-effort local OCR using tesseract.js when installed. */
export async function ocrImageDataUrl(dataUrl: string): Promise<string> {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
  const buffer = Buffer.from(base64, "base64");
  try {
    const tesseract = await import("tesseract.js");
    const result = await tesseract.recognize(buffer, "eng", {
      logger: () => undefined,
    });
    return result.data.text || "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Local OCR unavailable (${message}). Set OPENAI_API_KEY + a vision model, or point OPENAI_BASE_URL at a local vision LLM (e.g. Ollama llava).`,
    );
  }
}
