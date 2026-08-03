/**
 * Tolerant Overframe HTML / __NEXT_DATA__ parsers.
 * Class hashes on overframe.gg change; prefer JSON payload + loose text patterns.
 */
import type { BuildModEntry, OverframeBuild } from "./types.js";

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeArcane(name: string): boolean {
  return /^arcane\b/i.test(name) || /\barcane\b/i.test(name);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function entryFromUnknown(
  value: unknown,
  kindHint?: "mod" | "arcane",
): BuildModEntry | null {
  if (typeof value === "string" && value.trim()) {
    const name = value.trim();
    return {
      name,
      kind: kindHint ?? (looksLikeArcane(name) ? "arcane" : "mod"),
    };
  }
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const name =
    asString(row.name) ||
    asString(row.title) ||
    asString(row.uniqueName)?.split("/").pop()?.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (!name) return null;
  const kindRaw = asString(row.kind) || asString(row.type) || asString(row.category);
  const kind: "mod" | "arcane" =
    kindHint ??
    (kindRaw && /arcane/i.test(kindRaw)
      ? "arcane"
      : looksLikeArcane(name)
        ? "arcane"
        : "mod");
  return {
    name,
    kind,
    rank: asNumber(row.rank) ?? asNumber(row.level) ?? asNumber(row.modRank),
    slot: asString(row.slot) || asString(row.slotName) || asString(row.position),
  };
}

function collectModEntries(
  value: unknown,
  out: BuildModEntry[] = [],
  kindHint?: "mod" | "arcane",
): BuildModEntry[] {
  if (out.length >= 40) return out;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = entryFromUnknown(entry, kindHint);
      if (parsed) out.push(parsed);
      else collectModEntries(entry, out, kindHint);
      if (out.length >= 40) break;
    }
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const row = value as Record<string, unknown>;
  const keyed: Array<[string, "mod" | "arcane" | undefined]> = [
    ["mods", "mod"],
    ["modList", "mod"],
    ["modding", "mod"],
    ["arcanes", "arcane"],
    ["arcaneList", "arcane"],
    ["items", undefined],
  ];
  for (const [key, hint] of keyed) {
    if (key in row) collectModEntries(row[key], out, hint ?? kindHint);
  }
  // Only descend further when we still have nothing — avoid huge walks.
  if (!out.length) {
    for (const nested of Object.values(row)) {
      if (out.length) break;
      if (nested && typeof nested === "object") collectModEntries(nested, out, kindHint);
    }
  }
  return out;
}

function buildUrlFromRow(row: Record<string, unknown>): string | undefined {
  if (typeof row.url === "string" && /overframe\.gg\/build\//i.test(row.url)) return row.url;
  if (typeof row.buildUrl === "string") return row.buildUrl;
  if (typeof row.slug === "string" && (typeof row.id === "number" || typeof row.id === "string")) {
    return `https://overframe.gg/build/${row.id}/${row.slug}`;
  }
  return undefined;
}

/** Extract up to two top build cards/links from an item or search page. */
export function parseTopBuildLinks(itemName: string, html: string): OverframeBuild[] {
  const nextMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (nextMatch?.[1]) {
    try {
      const data = JSON.parse(nextMatch[1]) as unknown;
      const found = collectBuildCards(data).slice(0, 2);
      if (found.length) return found;
    } catch {
      /* fall through */
    }
  }

  const builds: OverframeBuild[] = [];
  const linkRe =
    /href="((?:https:\/\/overframe\.gg)?\/build\/\d+\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) && builds.length < 2) {
    let url = match[1]!;
    if (url.startsWith("/")) url = `https://overframe.gg${url}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const label = stripTags(match[2] || "").slice(0, 160);
    builds.push({
      rank: (builds.length + 1) as 1 | 2,
      name: label || `${itemName} build #${builds.length + 1}`,
      url,
      summary: label || `Top community build for ${itemName} on Overframe.`,
    });
  }
  return builds;
}

function collectBuildCards(value: unknown, out: OverframeBuild[] = []): OverframeBuild[] {
  if (out.length >= 2) return out;
  if (Array.isArray(value)) {
    for (const entry of value) collectBuildCards(entry, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const row = value as Record<string, unknown>;
  const url = buildUrlFromRow(row);
  const name = asString(row.name) || asString(row.title);
  const entries = collectModEntries(row);
  if (name && (url || entries.length)) {
    const mods = entries.filter((e) => e.kind === "mod").map((e) => e.name);
    const arcanes = entries.filter((e) => e.kind === "arcane").map((e) => e.name);
    out.push({
      rank: (out.length + 1) as 1 | 2,
      name,
      url,
      author:
        asString(row.author) ||
        (typeof row.user === "object" && row.user
          ? asString((row.user as Record<string, unknown>).name)
          : undefined),
      rating: asNumber(row.rating) ?? asNumber(row.score) ?? asNumber(row.likes),
      forma: asNumber(row.forma) ?? asNumber(row.formas),
      updatedAt: asString(row.updatedAt) || asString(row.updated_at),
      mods: mods.length ? mods : undefined,
      arcanes: arcanes.length ? arcanes : undefined,
      modEntries: entries.length ? entries : undefined,
      summary: summarizeBuild(name, mods, arcanes),
    });
  }
  for (const nested of Object.values(row)) {
    if (out.length >= 2) break;
    collectBuildCards(nested, out);
  }
  return out.slice(0, 2);
}

export function summarizeBuild(name: string, mods: string[], arcanes: string[]): string {
  const parts = [name];
  if (mods.length) parts.push(`mods: ${mods.slice(0, 16).join(", ")}`);
  if (arcanes.length) parts.push(`arcanes: ${arcanes.slice(0, 6).join(", ")}`);
  return parts.join(" — ");
}

/**
 * Parse a single Overframe build page for mods + arcanes.
 * Uses __NEXT_DATA__ when present, then CSS-module-ish class hooks, then text heuristics.
 */
export function parseBuildPageMods(html: string): {
  mods: string[];
  arcanes: string[];
  modEntries: BuildModEntry[];
  name?: string;
  forma?: number;
  author?: string;
} {
  const fromJson = parseBuildPageFromNextData(html);
  if (fromJson.modEntries.length || fromJson.mods.length || fromJson.arcanes.length) {
    return fromJson;
  }

  const modEntries: BuildModEntry[] = [];
  // Historical / current CSS-module class fragments seen in community scrapers.
  const modClassRe =
    /class="[^"]*(?:Mod_name|modName|mod-name|ModName)[^"]*"[^>]*>([\s\S]*?)<\//gi;
  const arcaneClassRe =
    /class="[^"]*(?:ArcaneMod_name|arcaneName|arcane-name|ArcaneName)[^"]*"[^>]*>([\s\S]*?)<\//gi;

  let match: RegExpExecArray | null;
  while ((match = modClassRe.exec(html))) {
    const name = stripTags(match[1] || "");
    if (name) modEntries.push({ name, kind: looksLikeArcane(name) ? "arcane" : "mod" });
  }
  while ((match = arcaneClassRe.exec(html))) {
    const name = stripTags(match[1] || "");
    if (name) modEntries.push({ name, kind: "arcane" });
  }

  const mods = uniqueNames(modEntries.filter((e) => e.kind === "mod").map((e) => e.name));
  const arcanes = uniqueNames(modEntries.filter((e) => e.kind === "arcane").map((e) => e.name));
  return { mods, arcanes, modEntries: dedupeEntries(modEntries) };
}

function parseBuildPageFromNextData(html: string) {
  const empty = { mods: [] as string[], arcanes: [] as string[], modEntries: [] as BuildModEntry[] };
  const nextMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!nextMatch?.[1]) return empty;
  try {
    const data = JSON.parse(nextMatch[1]) as unknown;
    const cards = collectBuildCards(data, []);
    const best = cards[0];
    const entries =
      best?.modEntries?.length ? best.modEntries : collectModEntries(data);
    const mods = uniqueNames(
      (best?.mods?.length ? best.mods : entries.filter((e) => e.kind === "mod").map((e) => e.name)),
    );
    const arcanes = uniqueNames(
      best?.arcanes?.length
        ? best.arcanes
        : entries.filter((e) => e.kind === "arcane").map((e) => e.name),
    );
    return {
      mods,
      arcanes,
      modEntries: dedupeEntries(entries),
      name: best?.name,
      forma: best?.forma,
      author: best?.author,
    };
  } catch {
    return empty;
  }
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function dedupeEntries(entries: BuildModEntry[]): BuildModEntry[] {
  const seen = new Set<string>();
  const out: BuildModEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.name.toLowerCase()}:${entry.slot ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export function isCloudflareChallenge(status: number, html: string): boolean {
  return status === 403 || /just a moment/i.test(html) || /cf-mitigated/i.test(html);
}
