import { findCatalogMatches } from "../query.js";
import { resolveRepoRoot } from "../repo-root.js";
import { loadCatalog } from "../store.js";
import type { CatalogItem } from "../types.js";
import {
  classifyWeapon,
  estimateWeaponDps,
  formatDpsEstimate,
} from "./formulas.js";
import { loadCommonMods, resolveModSet, resolvePresetMods } from "./mods.js";
import type {
  DpsEstimate,
  WeaponClass,
  WeaponDpsCompare,
  WeaponDpsInput,
} from "./types.js";

function num(stats: Record<string, unknown>, key: string, fallback = 0): number {
  const value = stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function catalogItemToWeaponInput(item: CatalogItem): WeaponDpsInput {
  const stats = item.stats || {};
  const tags = Array.isArray(stats.tags)
    ? stats.tags.map(String)
    : undefined;
  const weaponClass = classifyWeapon(item.category, item.type, tags);
  const damageRaw =
    stats.damage && typeof stats.damage === "object"
      ? (stats.damage as Record<string, number>)
      : undefined;
  const damage = damageRaw as WeaponDpsInput["damage"];
  const totalFromDamage =
    damageRaw && typeof damageRaw.total === "number" ? damageRaw.total : 0;
  return {
    id: item.id,
    name: item.name,
    weaponClass,
    totalDamage: num(stats, "totalDamage", totalFromDamage) || totalFromDamage,
    criticalChance: num(stats, "criticalChance"),
    criticalMultiplier: num(stats, "criticalMultiplier", 2),
    procChance: num(stats, "procChance"),
    fireRate: num(stats, "fireRate", 1),
    magazineSize: num(stats, "magazineSize", 1),
    reloadTime: num(stats, "reloadTime", 1),
    damage,
  };
}

function shouldAssumeViralAmp(modNames: string[]): boolean {
  const joined = modNames.join(" ").toLowerCase();
  return /viral|rime|malignant|infected|pathogen|contagious|chilling|deep freeze/.test(
    joined,
  );
}

export type EstimateOptions = {
  repoRoot?: string;
  mods?: string[];
  preset?: string;
  faction?: string;
  viralAmp?: number;
};

export async function estimateModdedDps(
  weaponQuery: string,
  options: EstimateOptions = {},
): Promise<{ ok: true; estimate: DpsEstimate; text: string } | { ok: false; message: string }> {
  const repoRoot = options.repoRoot ?? resolveRepoRoot();
  const catalog = await loadCatalog(repoRoot);
  const match = findCatalogMatches(catalog, weaponQuery, 1)[0];
  if (!match) {
    return { ok: false, message: `No local catalog match for weapon “${weaponQuery}”.` };
  }
  const weapon = catalogItemToWeaponInput(match);
  const common = await loadCommonMods(repoRoot);
  const presetMods = resolvePresetMods(common, options.preset, weapon.weaponClass);
  const requested = options.mods?.length ? options.mods : presetMods ?? [];
  if (!requested.length) {
    return {
      ok: false,
      message: [
        `Matched ${match.name}, but no mods/preset provided.`,
        "Pass mods, or preset like rifle-viral-heat / typical.",
      ].join("\n"),
    };
  }
  const resolved = resolveModSet(requested, common.mods, weapon.weaponClass);
  const viralAmp =
    options.viralAmp ??
    (shouldAssumeViralAmp(resolved.applied.map((m) => m.name)) ? 2.5 : 1);
  const estimate = estimateWeaponDps(weapon, resolved, {
    faction: options.faction,
    viralAmp,
  });
  return { ok: true, estimate, text: formatDpsEstimate(estimate) };
}

export async function compareWeaponsDps(
  weaponA: string,
  weaponB: string,
  options: EstimateOptions = {},
): Promise<{ ok: true; compare: WeaponDpsCompare; text: string } | { ok: false; message: string }> {
  const repoRoot = options.repoRoot ?? resolveRepoRoot();
  const catalog = await loadCatalog(repoRoot);
  const aItem = findCatalogMatches(catalog, weaponA, 1)[0];
  const bItem = findCatalogMatches(catalog, weaponB, 1)[0];
  if (!aItem || !bItem) {
    return {
      ok: false,
      message: `Could not resolve both weapons (A=${aItem?.name ?? "?"}, B=${bItem?.name ?? "?"}).`,
    };
  }

  const aWeapon = catalogItemToWeaponInput(aItem);
  const bWeapon = catalogItemToWeaponInput(bItem);
  const common = await loadCommonMods(repoRoot);

  // Prefer an explicit mod list; else pick a preset compatible with A (and warn if classes differ).
  const classForPreset: WeaponClass =
    aWeapon.weaponClass === bWeapon.weaponClass
      ? aWeapon.weaponClass
      : aWeapon.weaponClass;
  const presetMods =
    options.mods?.length
      ? null
      : resolvePresetMods(common, options.preset ?? "typical", classForPreset);
  const requested = options.mods?.length ? options.mods : presetMods ?? [];
  if (!requested.length) {
    return { ok: false, message: "No mods/preset available for comparison." };
  }

  const notes: string[] = [];
  if (aWeapon.weaponClass !== bWeapon.weaponClass) {
    notes.push(
      `Weapon classes differ (${aWeapon.weaponClass} vs ${bWeapon.weaponClass}); some mods may only apply to one side.`,
    );
  }

  const aMods = resolveModSet(requested, common.mods, aWeapon.weaponClass);
  const bMods = resolveModSet(requested, common.mods, bWeapon.weaponClass);
  const viralAmp =
    options.viralAmp ??
    (shouldAssumeViralAmp(requested) ? 2.5 : 1);

  const a = estimateWeaponDps(aWeapon, aMods, { faction: options.faction, viralAmp });
  const b = estimateWeaponDps(bWeapon, bMods, { faction: options.faction, viralAmp });

  const burstDeltaPct =
    a.modded.burstDps <= 0
      ? 0
      : ((b.modded.burstDps - a.modded.burstDps) / a.modded.burstDps) * 100;
  const sustainedDeltaPct =
    a.modded.sustainedDps <= 0
      ? 0
      : ((b.modded.sustainedDps - a.modded.sustainedDps) / a.modded.sustainedDps) * 100;

  const winnerBurst =
    b.modded.burstDps === a.modded.burstDps
      ? "tie"
      : b.modded.burstDps > a.modded.burstDps
        ? b.weaponName
        : a.weaponName;
  const winnerSustained =
    b.modded.sustainedDps === a.modded.sustainedDps
      ? "tie"
      : b.modded.sustainedDps > a.modded.sustainedDps
        ? b.weaponName
        : a.weaponName;

  const compare: WeaponDpsCompare = {
    a,
    b,
    winnerBurst,
    winnerSustained,
    burstDeltaPct: Math.round(burstDeltaPct * 10) / 10,
    sustainedDeltaPct: Math.round(sustainedDeltaPct * 10) / 10,
    summary: [
      [
        `Modded DPS compare under ${requested.length} mods`,
        options.preset ? ` (preset: ${options.preset})` : " (shared mod list / typical preset)",
        viralAmp > 1 ? `, viral amp x${viralAmp}` : "",
      ].join(""),
      winnerBurst === "tie"
        ? "Burst winner: tie"
        : `Burst winner: ${winnerBurst} (${Math.abs(burstDeltaPct).toFixed(1)}% ${burstDeltaPct >= 0 ? "higher for B" : "higher for A"})`,
      winnerSustained === "tie"
        ? "Sustained winner: tie"
        : `Sustained winner: ${winnerSustained} (${Math.abs(sustainedDeltaPct).toFixed(1)}% ${sustainedDeltaPct >= 0 ? "higher for B" : "higher for A"})`,
      ...notes,
    ].join("\n"),
  };

  const text = [
    compare.summary,
    "",
    formatDpsEstimate(a),
    "",
    formatDpsEstimate(b),
    "",
    "Caveats: offline arsenal-style estimate only — not incarnon/riven/arcane/DoT/armor TTK simulation.",
  ].join("\n");

  return { ok: true, compare, text };
}

export function formatPresetHelp(presets: Record<string, { description: string }>): string {
  return [
    "Available DPS presets:",
    ...Object.entries(presets).map(([id, preset]) => `• ${id} — ${preset.description}`),
    "",
    "Examples:",
    '  npm run knowledge -- dps "Coda Hema" --preset rifle-viral-heat',
    '  npm run knowledge -- compare-dps "Torid" "Ignis Wraith" --preset typical',
    '  npm run knowledge -- compare-dps "Laetum" "Felarx" --mods "Hornet Strike, Barrel Diffusion, Primed Pistol Gambit"',
  ].join("\n");
}
