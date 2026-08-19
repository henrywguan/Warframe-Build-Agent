/**
 * Full mod-name catalog from WFCD for arsenal / /wfm autocomplete.
 * Separate from mods/index.json (Overframe-seen mods used in lookup).
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchJson } from "./http.js";
import { knowledgePaths } from "./paths.js";
import { resolveRepoRoot } from "./repo-root.js";
import {
  loadArcaneDigests,
  loadCatalog,
  loadManifest,
  loadMods,
  saveModsNameCatalog,
} from "./store.js";
import type { CatalogItem, KnowledgeManifest } from "./types.js";

const WFCD_MODS = "https://api.warframestat.us/mods?language=en";

export type ModCatalogRow = {
  name: string;
  type?: string;
  tradable?: boolean;
  wikiaUrl?: string;
};

export type OfflineSuggestPack = {
  generatedAt: string;
  source: string;
  mods: string[];
  arcanes: string[];
  items: {
    warframe: string[];
    primary: string[];
    secondary: string[];
    melee: string[];
    companion: string[];
  };
};

/** Common companions (often missing from the weapons/frames catalog). */
export const COMPANION_SUGGEST_NAMES = [
  "Carrier",
  "Carrier Prime",
  "Dethcube",
  "Dethcube Prime",
  "Shade",
  "Shade Prime",
  "Wyrm",
  "Wyrm Prime",
  "Diriga",
  "Taxon",
  "Oxylus",
  "Helios",
  "Helios Prime",
  "Djinn",
  "Nautilus",
  "Nautilus Prime",
  "Vizier Predasite",
  "Medjay Predasite",
  "Pharaoh Predasite",
  "Smeeta Kavat",
  "Adarza Kavat",
  "Vasca Kavat",
  "Sunika Kubrow",
  "Raksa Kubrow",
  "Sahasa Kubrow",
  "Chesa Kubrow",
  "Huras Kubrow",
  "Helminth Charger",
  "Panzer Vulpaphyla",
  "Sly Vulpaphyla",
  "Crescent Vulpaphyla",
  "Venari",
  "Venari Prime",
  "Hound",
  "Moa",
];

const SKIP_TYPE = /^(Focus Way|.+\bRiven Mod)$/i;

export function slimModsFromWfcd(rows: Record<string, unknown>[]): ModCatalogRow[] {
  const byName = new Map<string, ModCatalogRow>();
  for (const row of rows) {
    const name = String(row.name || "").trim();
    if (name.length < 2) continue;
    const type = typeof row.type === "string" ? row.type : undefined;
    if (type && SKIP_TYPE.test(type)) continue;
    const key = name.toLowerCase();
    if (byName.has(key)) continue;
    byName.set(key, {
      name,
      type,
      tradable: Boolean(row.tradable),
      wikiaUrl: typeof row.wikiaUrl === "string" ? row.wikiaUrl : undefined,
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function slotNamesFromCatalog(catalog: CatalogItem[]): OfflineSuggestPack["items"] {
  const items: OfflineSuggestPack["items"] = {
    warframe: [],
    primary: [],
    secondary: [],
    melee: [],
    companion: [...COMPANION_SUGGEST_NAMES],
  };
  for (const row of catalog) {
    const name = row.name?.trim();
    if (!name) continue;
    if (row.kind === "warframe") {
      items.warframe.push(name);
      continue;
    }
    if (row.kind !== "weapon") continue;
    const cat = (row.category || "").toLowerCase();
    if (cat === "primary" || cat === "arch-gun") items.primary.push(name);
    else if (cat === "secondary") items.secondary.push(name);
    else if (cat === "melee" || cat === "arch-melee") items.melee.push(name);
  }
  return {
    warframe: uniqueSorted(items.warframe),
    primary: uniqueSorted(items.primary),
    secondary: uniqueSorted(items.secondary),
    melee: uniqueSorted(items.melee),
    companion: uniqueSorted(items.companion),
  };
}

export function buildOfflineSuggestPack(options: {
  mods: ModCatalogRow[];
  catalog: CatalogItem[];
  arcanes: string[];
  extraModNames?: string[];
}): OfflineSuggestPack {
  const fromOverframe = options.extraModNames ?? [];
  return {
    generatedAt: new Date().toISOString(),
    source: "WFCD mods + local catalog/arcanes",
    mods: uniqueSorted([...options.mods.map((m) => m.name), ...fromOverframe]),
    arcanes: uniqueSorted(options.arcanes.filter(Boolean)),
    items: slotNamesFromCatalog(options.catalog),
  };
}

function uniqueSorted(names: string[]): string[] {
  const map = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!map.has(key)) map.set(key, trimmed);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}

export async function fetchWfcdMods(): Promise<ModCatalogRow[]> {
  const rows = await fetchJson<Record<string, unknown>[]>(WFCD_MODS);
  return slimModsFromWfcd(Array.isArray(rows) ? rows : []);
}

export function webSuggestPath(repoRoot: string): string {
  return path.join(repoRoot, "web", "src", "data", "offline-suggest.json");
}

/** Pull WFCD mod names and write pack + web autocomplete JSON. */
export async function pullModsNameCatalog(options: {
  repoRoot?: string;
  onLog?: (line: string) => void;
} = {}): Promise<KnowledgeManifest> {
  const repoRoot = options.repoRoot ?? resolveRepoRoot();
  const log = options.onLog ?? ((line: string) => console.log(line));
  log("Pulling WFCD mod names for autocomplete...");
  const mods = await fetchWfcdMods();
  log(`WFCD mods: ${mods.length} names`);

  const [catalog, arcanes, overframeMods, previous] = await Promise.all([
    loadCatalog(repoRoot),
    loadArcaneDigests(repoRoot),
    loadMods(repoRoot),
    loadManifest(repoRoot),
  ]);
  const pack = buildOfflineSuggestPack({
    mods,
    catalog,
    arcanes: arcanes.map((a) => a.title),
    extraModNames: overframeMods.filter((m) => m.kind === "mod").map((m) => m.name),
  });

  await mkdir(path.dirname(knowledgePaths(repoRoot).modsCatalog), { recursive: true });
  const manifest = await saveModsNameCatalog({
    repoRoot,
    rows: mods,
    suggest: pack,
    webPath: webSuggestPath(repoRoot),
    notes: [`WFCD mod-name catalog: ${mods.length} names for arsenal /wfm autocomplete.`],
    previous,
  });
  log(
    `Saved mod-name catalog (${mods.length}) + web suggest (mods ${pack.mods.length}, arcanes ${pack.arcanes.length}).`,
  );
  return manifest;
}
