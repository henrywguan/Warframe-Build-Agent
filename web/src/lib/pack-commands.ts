/**
 * Offline pack helpers for web slash commands (/build, /farm, /arcanes, /preset).
 * Mirrors src/knowledge/pack-shortcuts.ts without importing the root package.
 */

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runOfflineDps } from "@/lib/offline-dps";

interface Manifest {
  generatedAt: string;
  overframeStatus: string;
}

interface CatalogItem {
  id: string;
  name: string;
  kind: string;
  masteryReq?: number;
  wikiaUrl?: string;
}

interface WikiDigest {
  extract: string;
  pageUrl?: string;
}

interface ItemBuilds {
  builds: Array<{
    rank: number;
    name: string;
    summary: string;
    mods?: string[];
    arcanes?: string[];
    url?: string;
    forma?: number;
  }>;
  error?: string;
}

interface ArcaneDigest {
  id: string;
  title: string;
  slot: string;
  aliases?: string[];
  summary?: string;
  pageUrl?: string;
  extract: string;
}

interface CommonModsFile {
  asOf?: string;
  notes?: string[];
  presets: Record<string, { description?: string; mods: string[] }>;
}

const ACQUISITION_RE =
  /Acquisition\s+([\s\S]*?)(?=\n\n(?:Crafting|Notes|Tips|Trivia|Media|Patch History|See also)|$)/i;

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

async function findCatalogMatches(query: string, limit = 3): Promise<{
  root: string;
  matches: CatalogItem[];
  manifest: Manifest | null;
} | null> {
  const root = knowledgeRoot();
  if (!root) return null;
  const manifest = await readJson<Manifest>(path.join(root, "manifest.json"));
  const catalog =
    (await readJson<CatalogItem[]>(path.join(root, "catalog", "items.json"))) ||
    [];
  const matches = catalog
    .map((item) => ({ item, score: scoreName(query, item.name) }))
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((row) => row.item);
  return { root, matches, manifest };
}

function extractAcquisitionBlob(extract: string): string | null {
  const match = extract.match(ACQUISITION_RE);
  if (!match?.[1]) return null;
  const blob = match[1].replace(/\s+/g, " ").trim();
  return blob || null;
}

export async function packBuildLookup(itemQuery: string): Promise<string> {
  const found = await findCatalogMatches(itemQuery, 3);
  if (!found) {
    return [
      "Local knowledge pack not found.",
      "From repo root run: npm run knowledge -- pull",
    ].join("\n");
  }
  if (!found.matches.length) {
    return `No catalog match for “${itemQuery}”. Try /knowledge ${itemQuery}`;
  }

  const lines = [
    `Local Overframe / imported builds (${found.manifest?.overframeStatus ?? "?"} · ${found.manifest?.generatedAt ?? "?"})`,
    "",
  ];
  let any = false;
  for (const item of found.matches) {
    const builds = await readJson<ItemBuilds>(
      path.join(found.root, "builds", "by-item", `${item.id}.json`),
    );
    lines.push(`## ${item.name}`);
    if (!builds?.builds?.length) {
      lines.push(
        builds?.error
          ? `Unavailable: ${builds.error}`
          : "No cached community builds for this item.",
        "Tip: turn on Online search in chat, or import builds (docs/overframe-crawl.md).",
        "",
      );
      continue;
    }
    any = true;
    for (const build of builds.builds.slice(0, 3)) {
      lines.push(
        `${build.rank}. ${build.name}${build.forma != null ? ` · ${build.forma} forma` : ""}`,
      );
      if (build.summary) lines.push(build.summary);
      if (build.mods?.length) lines.push(`Mods: ${build.mods.join(", ")}`);
      if (build.arcanes?.length) lines.push(`Arcanes: ${build.arcanes.join(", ")}`);
      if (build.url) lines.push(build.url);
      lines.push("");
    }
  }
  if (!any) lines.push("No local builds found for the matched items.");
  return lines.join("\n").trim();
}

export async function packFarmLookup(itemQuery: string): Promise<string> {
  const found = await findCatalogMatches(itemQuery, 3);
  if (!found) {
    return "Local knowledge pack not found. Run: npm run knowledge -- pull";
  }
  if (!found.matches.length) {
    return `No catalog match for “${itemQuery}”.`;
  }

  const lines = [
    `Farming route (offline pack · ${found.manifest?.generatedAt ?? "?"})`,
    "",
  ];
  for (const item of found.matches) {
    lines.push(`## ${item.name}`);
    if (item.masteryReq != null) lines.push(`Mastery: ${item.masteryReq}`);
    if (item.wikiaUrl) lines.push(item.wikiaUrl);
    const wiki = await readJson<WikiDigest>(
      path.join(found.root, "wiki", "digests", `${item.id}.json`),
    );
    if (!wiki?.extract) {
      lines.push("No wiki digest — run npm run knowledge -- pull", "");
      continue;
    }
    const acquisition = extractAcquisitionBlob(wiki.extract);
    if (acquisition) {
      lines.push("### Acquisition", acquisition);
    } else {
      lines.push(
        "### Acquisition (best-effort wiki extract)",
        wiki.extract.slice(0, 900).trim() + (wiki.extract.length > 900 ? "…" : ""),
      );
    }
    if (wiki.pageUrl) lines.push("", wiki.pageUrl);
    lines.push("");
  }
  lines.push("Tip: ask in plain language for quest gates + farm alternatives.");
  return lines.join("\n").trim();
}

export async function packArcaneLookup(query: string): Promise<string> {
  const root = knowledgeRoot();
  if (!root) return "Local knowledge pack not found.";
  const index = await readJson<{ ids?: string[] }>(
    path.join(root, "arcanes", "index.json"),
  );
  const digests: ArcaneDigest[] = [];
  for (const id of index?.ids ?? []) {
    const digest = await readJson<ArcaneDigest>(
      path.join(root, "arcanes", "digests", `${id}.json`),
    );
    if (digest) digests.push(digest);
  }
  if (!digests.length) {
    return "No arcane digests. Run: npm run knowledge -- pull-arcanes";
  }

  const q = normalize(query || "arcanes");
  const listMode = /^(arcane|arcanes)s?$/.test(q) || /\barcanes?\b/.test(q);
  const hits = digests
    .map((digest) => {
      const labels = [
        digest.title,
        ...(digest.aliases || []),
        digest.slot,
        `${digest.slot} arcane`,
      ];
      let score = Math.max(0, ...labels.map((label) => scoreName(query, label)));
      if (listMode && q.includes(digest.slot) && digest.slot !== "other") {
        score = Math.max(score, 70);
      }
      if (listMode && (q === "arcane" || q === "arcanes")) {
        score = Math.max(score, 50);
      }
      return { digest, score };
    })
    .filter((row) => row.score >= (listMode ? 45 : 70))
    .sort((a, b) => b.score - a.score || a.digest.title.localeCompare(b.digest.title))
    .slice(0, 8)
    .map((row) => row.digest);

  if (!hits.length) {
    return `No arcane match for “${query}”. Try: primary, secondary, melee, warframe, or a name.`;
  }

  const lines = [`Arcane digests (${hits.length})`, ""];
  for (const digest of hits) {
    lines.push(
      `## ${digest.title} (${digest.slot})`,
      digest.summary ?? "",
      digest.pageUrl ?? "",
      digest.extract.slice(0, 1200) + (digest.extract.length > 1200 ? "…" : ""),
      "",
    );
  }
  return lines.join("\n").trim();
}

export async function packPresetList(): Promise<string> {
  const root = knowledgeRoot();
  if (!root) return "Local knowledge pack not found.";
  const file = await readJson<CommonModsFile>(
    path.join(root, "dps", "common-mods.json"),
  );
  if (!file?.presets) return "common-mods.json missing presets.";

  const lines = [
    `DPS mod presets (asOf: ${file.asOf ?? "unknown"})`,
    "",
  ];
  for (const [name, preset] of Object.entries(file.presets)) {
    lines.push(
      `• ${name}${preset.description ? ` — ${preset.description}` : ""}`,
      `  ${preset.mods.join(", ")}`,
    );
  }
  if (file.notes?.length) {
    lines.push("", "Notes:");
    for (const note of file.notes.slice(0, 6)) lines.push(`• ${note}`);
  }
  lines.push(
    "",
    "Use: /preset <name> <weapon>   or   /dps <weapon> --preset <name>",
  );
  return lines.join("\n");
}

export async function packPresetDps(
  preset: string,
  weapon: string,
): Promise<string> {
  return runOfflineDps({ weapon, preset });
}

export function stubDuviriCircuit(): string {
  return [
    "Duviri / The Circuit — stub",
    "",
    "Live Circuit spoil choices are not fully modeled in this web deploy yet.",
    "Nearby live data: /cycles (includes Duviri cycle)",
    "CLI: npm run wf -- cycles",
    "Ask in plain language for spoil priorities (or use the steel-path-loadout / farming-route skills).",
  ].join("\n");
}

export function stubFocusShards(frameHint?: string): string {
  return [
    `Focus / Archon shards${frameHint ? ` for ${frameHint}` : ""} — stub`,
    "",
    "Shard advice uses pack facts + build assumptions (not a live inventory).",
    "Typical Steel Path defaults:",
    "• Crimson (ability strength / duration) or Amber (casting / energy) for most casters",
    "• Azure (armor / health / energy max) for tankier frames",
    "• Tauforged preferred when you have them",
    "",
    frameHint
      ? `Ask in plain language: “best archon shards for ${frameHint} Steel Path”`
      : "Usage: /shards <frame>   or   /focus <frame>",
    "Also: /knowledge <frame> for local digests.",
  ].join("\n");
}

export function stubVendor(syndicate?: string): string {
  const name = syndicate?.trim() || "(name a syndicate)";
  return [
    `Vendor / standing gifts — ${name}`,
    "",
    "Priorities are not live-tracked yet. Common high-value standing targets:",
    "• Galvanized mods (Arbitration / vendors when offered)",
    "• Archon shards / mez / focus lenses depending on syndicate",
    "• Unique weapons / blueprints locked behind standing ranks",
    "",
    "Usage: /vendor zariman | holdfasts | entrati | ostron | solaris | ...",
    "Farm routes: /farm <item> · Market: /market <slug> · /slug <item name>",
  ].join("\n");
}
