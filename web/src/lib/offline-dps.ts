/**
 * Offline modded DPS for the web chat.
 * Reads the repo knowledge pack (catalog + curated mod DB) and applies the same
 * arsenal-style formulas as `npm run knowledge -- dps|compare-dps`.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

type WeaponClass = "rifle" | "pistol" | "shotgun" | "melee" | "unknown";

type CatalogItem = {
  id: string;
  name: string;
  kind: string;
  category: string;
  type?: string;
  stats: Record<string, unknown>;
};

type CuratedMod = {
  name: string;
  classes: string[];
  effects: {
    baseDamage?: number;
    multishot?: number;
    critChance?: number;
    critDamage?: number;
    fireRate?: number;
    reload?: number;
    statusChance?: number;
    faction?: number;
    elemental?: Record<string, number>;
  };
};

type CommonModsFile = {
  mods: CuratedMod[];
  presets: Record<string, { description: string; mods: string[] }>;
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

function num(stats: Record<string, unknown>, key: string, fallback = 0): number {
  const value = stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function classifyWeapon(category: string, type?: string, tags?: string[]): WeaponClass {
  const hay = `${category} ${type ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();
  if (/melee|blade|sword|polearm|nikana|hammer|fists/.test(hay)) return "melee";
  if (/shotgun/.test(hay)) return "shotgun";
  if (/pistol|secondary|thrown/.test(hay)) return "pistol";
  if (/rifle|primary|bow|sniper|launcher|beam/.test(hay)) return "rifle";
  return "unknown";
}

function expectedCritMultiplier(critChance: number, critMult: number): number {
  const cc = Math.max(0, critChance);
  const cd = Math.max(1, critMult);
  if (cc <= 0) return 1;
  if (cc <= 1) return 1 + cc * (cd - 1);
  const tier = Math.floor(cc);
  const frac = cc - tier;
  const tierMult = 1 + tier * (cd - 1);
  const nextMult = 1 + (tier + 1) * (cd - 1);
  return tierMult * (1 - frac) + nextMult * frac;
}

/** Prefer status secondaries (viral/corrosive/…) before blast/gas when pairing. */
const COMBOS: Array<[string, string, string]> = [
  ["cold", "toxin", "viral"],
  ["electricity", "toxin", "corrosive"],
  ["cold", "electricity", "magnetic"],
  ["heat", "electricity", "radiation"],
  ["heat", "toxin", "gas"],
  ["heat", "cold", "blast"],
];

function combineElements(elementalPct: Record<string, number>): Record<string, number> {
  const pool = { ...elementalPct };
  const out: Record<string, number> = {};
  for (const [a, b, combo] of COMBOS) {
    const av = pool[a] ?? 0;
    const bv = pool[b] ?? 0;
    if (av > 0 && bv > 0) {
      const used = Math.min(av, bv);
      out[combo] = (out[combo] ?? 0) + used * 2;
      pool[a] = av - used;
      pool[b] = bv - used;
    }
  }
  for (const key of ["heat", "cold", "electricity", "toxin", "impact", "puncture", "slash"]) {
    if ((pool[key] ?? 0) > 0) out[key] = (out[key] ?? 0) + (pool[key] ?? 0);
  }
  return out;
}

function findMod(mods: CuratedMod[], name: string, weaponClass: WeaponClass): CuratedMod | null {
  const q = normalize(name);
  let best: { mod: CuratedMod; score: number } | null = null;
  for (const mod of mods) {
    const n = normalize(mod.name);
    let score = 0;
    if (n === q) score = 100;
    else if (n.startsWith(q) || q.startsWith(n)) score = 80;
    else if (n.includes(q) || q.includes(n)) score = 60;
    if (score < 60) continue;
    const classOk =
      mod.classes.includes("any") ||
      mod.classes.includes(weaponClass) ||
      weaponClass === "unknown";
    if (!classOk) score -= 25;
    if (!best || score > best.score) best = { mod, score };
  }
  return best && best.score >= 50 ? best.mod : null;
}

function resolveMods(requested: string[], catalog: CuratedMod[], weaponClass: WeaponClass) {
  const applied: CuratedMod[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const name of requested) {
    const key = normalize(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const hit = findMod(catalog, name, weaponClass);
    if (!hit) unknown.push(name);
    else applied.push(hit);
  }
  const totals = {
    baseDamage: 0,
    multishot: 0,
    critChance: 0,
    critDamage: 0,
    fireRate: 0,
    reload: 0,
    statusChance: 0,
    faction: 0,
    elemental: {} as Record<string, number>,
  };
  for (const mod of applied) {
    const e = mod.effects;
    totals.baseDamage += e.baseDamage ?? 0;
    totals.multishot += e.multishot ?? 0;
    totals.critChance += e.critChance ?? 0;
    totals.critDamage += e.critDamage ?? 0;
    totals.fireRate += e.fireRate ?? 0;
    totals.reload += e.reload ?? 0;
    totals.statusChance += e.statusChance ?? 0;
    totals.faction += e.faction ?? 0;
    for (const [el, pct] of Object.entries(e.elemental ?? {})) {
      totals.elemental[el] = (totals.elemental[el] ?? 0) + (pct ?? 0);
    }
  }
  return { applied, unknown, totals };
}

function presetMods(file: CommonModsFile, preset: string | undefined, weaponClass: WeaponClass) {
  if (!preset) return null;
  const key = normalize(preset).replace(/\s+/g, "-");
  if (file.presets[preset]?.mods) return [...file.presets[preset].mods];
  if (file.presets[key]?.mods) return [...file.presets[key].mods];
  if (/typical|standard|default|viral.?heat|status/.test(key)) {
    if (weaponClass === "pistol") return [...(file.presets["pistol-viral-heat"]?.mods ?? [])];
    if (weaponClass === "shotgun") return [...(file.presets["shotgun-viral-heat"]?.mods ?? [])];
    return [...(file.presets["rifle-viral-heat"]?.mods ?? [])];
  }
  if (/corrosive/.test(key)) return [...(file.presets["rifle-corrosive-heat"]?.mods ?? [])];
  if (/raw|crit/.test(key)) return [...(file.presets["rifle-raw-crit"]?.mods ?? [])];
  return null;
}

function estimate(item: CatalogItem, requested: string[], common: CommonModsFile, viralAmp: number) {
  const stats = item.stats || {};
  const tags = Array.isArray(stats.tags) ? stats.tags.map(String) : undefined;
  const weaponClass = classifyWeapon(item.category, item.type, tags);
  const damageObj =
    stats.damage && typeof stats.damage === "object"
      ? (stats.damage as Record<string, number>)
      : undefined;
  const totalDamage =
    num(stats, "totalDamage") ||
    (typeof damageObj?.total === "number" ? damageObj.total : 0);
  const critChance = num(stats, "criticalChance");
  const critMult = num(stats, "criticalMultiplier", 2);
  const procChance = num(stats, "procChance");
  const fireRateBase = num(stats, "fireRate", 1);
  const mag = Math.max(1, num(stats, "magazineSize", 1));
  const reloadBase = Math.max(0.05, num(stats, "reloadTime", 1));

  const resolved = resolveMods(requested, common.mods, weaponClass);
  const t = resolved.totals;
  const moddedBase = totalDamage * (1 + t.baseDamage);
  const combined = combineElements(t.elemental);
  const elementalPctSum = Object.values(combined).reduce((s, v) => s + v, 0);
  const beforeCrit = moddedBase + moddedBase * elementalPctSum;
  const avgCrit = expectedCritMultiplier(
    critChance * (1 + t.critChance),
    critMult * (1 + t.critDamage),
  );
  const multishot = Math.max(0.01, 1 * (1 + t.multishot));
  const fireRate = Math.max(0.01, fireRateBase * (1 + t.fireRate));
  const reload = reloadBase / (1 + Math.max(0, t.reload));
  const factionMultiplier = 1 + Math.max(0, t.faction);
  const perShot = beforeCrit * avgCrit * multishot * factionMultiplier * viralAmp;
  const burst = perShot * fireRate;
  const cycle = mag / fireRate + reload;
  const sustained = (perShot * mag) / cycle;

  const unCrit = expectedCritMultiplier(critChance, critMult);
  const unShot = totalDamage * unCrit;
  const unBurst = unShot * fireRateBase;
  const unCycle = mag / Math.max(0.01, fireRateBase) + reloadBase;
  const unSustained = (unShot * mag) / unCycle;

  return {
    name: item.name,
    weaponClass,
    applied: resolved.applied.map((m) => m.name),
    unknown: resolved.unknown,
    unmoddedBurst: Math.round(unBurst * 10) / 10,
    unmoddedSustained: Math.round(unSustained * 10) / 10,
    moddedBurst: Math.round(burst * 10) / 10,
    moddedSustained: Math.round(sustained * 10) / 10,
    perShot: Math.round(perShot * 10) / 10,
    avgCrit: Math.round(avgCrit * 1000) / 1000,
    multishot: Math.round(multishot * 1000) / 1000,
    fireRate: Math.round(fireRate * 1000) / 1000,
    statusChance: Math.min(3, procChance * (1 + t.statusChance)),
    elemental: combined,
  };
}

function formatOne(est: ReturnType<typeof estimate>, viralAmp: number): string {
  return [
    `## ${est.name} (${est.weaponClass}) — modded DPS estimate`,
    `Mods applied (${est.applied.length}): ${est.applied.join(", ") || "(none)"}`,
    est.unknown.length ? `Unmodeled mods: ${est.unknown.join(", ")}` : "",
    "",
    "Unmodded:",
    `• Burst DPS: ${est.unmoddedBurst}`,
    `• Sustained DPS: ${est.unmoddedSustained}`,
    "",
    "Modded:",
    `• Damage/shot: ${est.perShot}`,
    `• Avg crit mult: ${est.avgCrit} · Multishot: ${est.multishot} · Fire rate: ${est.fireRate}`,
    `• Status chance: ${(est.statusChance * 100).toFixed(1)}%`,
    `• Burst DPS: ${est.moddedBurst}`,
    `• Sustained DPS: ${est.moddedSustained}`,
    viralAmp > 1 ? `• Viral amp guidance: ×${viralAmp}` : "",
    "",
    "Notes:",
    "• Arsenal-style estimate: direct damage only (no slash DoT ticks / full armor TTK).",
    "• Galvanized stacks, rivens, arcanes, and incarnon transforms are not fully modeled.",
  ]
    .filter(Boolean)
    .join("\n");
}

function findWeapon(catalog: CatalogItem[], query: string): CatalogItem | null {
  return (
    catalog
      .map((item) => ({ item, score: scoreName(query, item.name) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.item ?? null
  );
}

export async function runOfflineDps(options: {
  weapon: string;
  weaponB?: string;
  mods?: string[];
  preset?: string;
  viralAmp?: number;
}): Promise<string> {
  const root = knowledgeRoot();
  if (!root) {
    return "Local knowledge pack not found. Run: npm run knowledge -- pull";
  }
  const catalog =
    (await readJson<CatalogItem[]>(path.join(root, "catalog", "items.json"))) || [];
  const common = await readJson<CommonModsFile>(path.join(root, "dps", "common-mods.json"));
  if (!common) {
    return "Curated DPS mod DB missing (data/knowledge/dps/common-mods.json).";
  }

  const a = findWeapon(catalog, options.weapon);
  if (!a) return `No local catalog match for weapon “${options.weapon}”.`;

  const aClass = classifyWeapon(
    a.category,
    a.type,
    Array.isArray(a.stats.tags) ? a.stats.tags.map(String) : undefined,
  );
  const requested =
    options.mods?.length
      ? options.mods
      : presetMods(common, options.preset ?? "typical", aClass) ?? [];
  if (!requested.length) {
    return "No mods/preset available. Try preset rifle-viral-heat or pass mods.";
  }
  const viralAmp =
    options.viralAmp ??
    (/viral|rime|malignant|infected|pathogen|contagious|chilling|deep freeze/i.test(
      requested.join(" "),
    )
      ? 2.5
      : 1);

  if (!options.weaponB) {
    return formatOne(estimate(a, requested, common, viralAmp), viralAmp);
  }

  const b = findWeapon(catalog, options.weaponB);
  if (!b) return `No local catalog match for weapon “${options.weaponB}”.`;
  const ea = estimate(a, requested, common, viralAmp);
  const eb = estimate(b, requested, common, viralAmp);
  const burstDelta =
    ea.moddedBurst <= 0 ? 0 : ((eb.moddedBurst - ea.moddedBurst) / ea.moddedBurst) * 100;
  const sustDelta =
    ea.moddedSustained <= 0
      ? 0
      : ((eb.moddedSustained - ea.moddedSustained) / ea.moddedSustained) * 100;
  const winnerBurst =
    eb.moddedBurst === ea.moddedBurst
      ? "tie"
      : eb.moddedBurst > ea.moddedBurst
        ? eb.name
        : ea.name;
  const winnerSustained =
    eb.moddedSustained === ea.moddedSustained
      ? "tie"
      : eb.moddedSustained > ea.moddedSustained
        ? eb.name
        : ea.name;

  return [
    `Modded DPS compare under ${requested.length} mods` +
      (options.preset ? ` (preset: ${options.preset})` : " (typical/shared list)") +
      (viralAmp > 1 ? `, viral amp ×${viralAmp}` : ""),
    `Burst winner: ${winnerBurst}${winnerBurst === "tie" ? "" : ` (${Math.abs(burstDelta).toFixed(1)}%)`}`,
    `Sustained winner: ${winnerSustained}${winnerSustained === "tie" ? "" : ` (${Math.abs(sustDelta).toFixed(1)}%)`}`,
    "",
    formatOne(ea, viralAmp),
    "",
    formatOne(eb, viralAmp),
    "",
    "Caveats: offline arsenal-style estimate only — not incarnon/riven/arcane/DoT/armor TTK simulation.",
  ].join("\n");
}
