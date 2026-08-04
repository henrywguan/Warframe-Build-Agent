/**
 * Arsenal-style modded DPS estimator (offline guidance).
 * Not a full Warframe simulator: skips DoT ticks, armor curves, conditionals,
 * incarnon transforms, rivens, and most arcanes.
 */
import type {
  DpsEstimate,
  ElementKey,
  ResolvedModSet,
  WeaponDpsInput,
} from "./types.js";

/** Prefer status secondaries (viral/corrosive/…) before blast/gas when pairing. */
const ELEMENT_COMBOS: Array<[ElementKey, ElementKey, ElementKey]> = [
  ["cold", "toxin", "viral"],
  ["electricity", "toxin", "corrosive"],
  ["cold", "electricity", "magnetic"],
  ["heat", "electricity", "radiation"],
  ["heat", "toxin", "gas"],
  ["heat", "cold", "blast"],
];

export function expectedCritMultiplier(critChance: number, critMult: number): number {
  const cc = Math.max(0, critChance);
  const cd = Math.max(1, critMult);
  if (cc <= 0) return 1;
  if (cc <= 1) return 1 + cc * (cd - 1);
  // Orange / red tier approximation for cc > 100%.
  const tier = Math.floor(cc);
  const frac = cc - tier;
  const tierMult = 1 + tier * (cd - 1);
  const nextMult = 1 + (tier + 1) * (cd - 1);
  return tierMult * (1 - frac) + nextMult * frac;
}

/** Combine primary element bonuses into secondary elements (pair order fixed). */
export function combineElements(
  elementalPct: Partial<Record<ElementKey, number>>,
): Partial<Record<ElementKey, number>> {
  const pool: Partial<Record<ElementKey, number>> = { ...elementalPct };
  const out: Partial<Record<ElementKey, number>> = {};

  for (const [a, b, combo] of ELEMENT_COMBOS) {
    const av = pool[a] ?? 0;
    const bv = pool[b] ?? 0;
    if (av > 0 && bv > 0) {
      const used = Math.min(av, bv);
      out[combo] = (out[combo] ?? 0) + used * 2;
      pool[a] = av - used;
      pool[b] = bv - used;
    }
  }
  for (const key of ["heat", "cold", "electricity", "toxin", "impact", "puncture", "slash"] as ElementKey[]) {
    if ((pool[key] ?? 0) > 0) out[key] = (out[key] ?? 0) + (pool[key] ?? 0);
  }
  return out;
}

export function classifyWeapon(category: string, type?: string, tags?: string[]): import("./types.js").WeaponClass {
  const hay = `${category} ${type ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();
  if (/melee|blade|sword|polearm|staff|whip|glaive|nikana|hammer|fists|sparring/.test(hay)) {
    return "melee";
  }
  if (/shotgun/.test(hay)) return "shotgun";
  if (/pistol|secondary|thrown/.test(hay)) return "pistol";
  if (/rifle|primary|bow|sniper|launcher|speargun|beam|continuous/.test(hay)) return "rifle";
  return "unknown";
}

export function estimateWeaponDps(
  weapon: WeaponDpsInput,
  mods: ResolvedModSet,
  options?: {
    faction?: string;
    /** Approximate average Viral health amp when status is invested (1 = none). */
    viralAmp?: number;
  },
): DpsEstimate {
  const t = mods.totals;
  const base = Math.max(0, weapon.totalDamage);
  const moddedBase = base * (1 + t.baseDamage);

  const combined = combineElements(t.elemental);
  const elementalPctSum = Object.values(combined).reduce((sum, v) => sum + (v ?? 0), 0);
  const elementalDamage = moddedBase * elementalPctSum;
  const damageBeforeCritMs = moddedBase + elementalDamage;

  const critChance = Math.max(0, weapon.criticalChance * (1 + t.critChance));
  const critMult = Math.max(1, weapon.criticalMultiplier * (1 + t.critDamage));
  const avgCrit = expectedCritMultiplier(critChance, critMult);

  const multishot = Math.max(0.01, (weapon.innateMultishot ?? 1) * (1 + t.multishot));
  const fireRate = Math.max(0.01, weapon.fireRate * (1 + t.fireRate));
  const reloadTime = Math.max(0.05, weapon.reloadTime / (1 + Math.max(0, t.reload)));
  const statusChance = Math.min(3, Math.max(0, weapon.procChance * (1 + t.statusChance)));

  const factionMultiplier = 1 + Math.max(0, t.faction);
  const viralAmp = options?.viralAmp && options.viralAmp > 1 ? options.viralAmp : 1;

  const damagePerShot =
    damageBeforeCritMs * avgCrit * multishot * factionMultiplier * viralAmp;
  const burstDps = damagePerShot * fireRate;

  const mag = Math.max(1, weapon.magazineSize);
  // Continuous / ammo-efficiency weapons still get a magazine-cycle approximation.
  const timeToEmpty = mag / fireRate;
  const cycle = timeToEmpty + reloadTime;
  const sustainedDps = cycle > 0 ? (damagePerShot * mag) / cycle : burstDps;

  const unmoddedShot = base;
  const unmoddedCrit = expectedCritMultiplier(
    weapon.criticalChance,
    weapon.criticalMultiplier,
  );
  const unmoddedPerShot = unmoddedShot * unmoddedCrit * (weapon.innateMultishot ?? 1);
  const unmoddedBurst = unmoddedPerShot * Math.max(0.01, weapon.fireRate);
  const unmoddedEmpty = mag / Math.max(0.01, weapon.fireRate);
  const unmoddedCycle = unmoddedEmpty + Math.max(0.05, weapon.reloadTime);
  const unmoddedSustained =
    unmoddedCycle > 0 ? (unmoddedPerShot * mag) / unmoddedCycle : unmoddedBurst;

  const elementalBreakdown: Partial<Record<ElementKey, number>> = {};
  for (const [key, pct] of Object.entries(combined)) {
    elementalBreakdown[key as ElementKey] = moddedBase * (pct ?? 0);
  }

  const notes: string[] = [
    "Arsenal-style estimate: direct damage only (no slash DoT ticks, no full armor TTK).",
    "Galvanized/conditional stacks and rivens/arcanes are not fully modeled.",
  ];
  if (viralAmp > 1) {
    notes.push(
      `Includes approximate Viral health amp ×${viralAmp.toFixed(2)} for status-oriented guidance.`,
    );
  }
  if (mods.unknown.length) {
    notes.push(`Unknown/unmodeled mods ignored: ${mods.unknown.join(", ")}`);
  }

  return {
    weaponName: weapon.name,
    weaponClass: weapon.weaponClass,
    modsApplied: mods.applied.map((m) => m.name),
    unknownMods: mods.unknown,
    unmodded: {
      damagePerShot: round(unmoddedPerShot),
      burstDps: round(unmoddedBurst),
      sustainedDps: round(unmoddedSustained),
    },
    modded: {
      damagePerShot: round(damagePerShot),
      avgCritMultiplier: round(avgCrit, 3),
      multishot: round(multishot, 3),
      fireRate: round(fireRate, 3),
      statusChance: round(statusChance, 3),
      burstDps: round(burstDps),
      sustainedDps: round(sustainedDps),
      elementalBreakdown: Object.fromEntries(
        Object.entries(elementalBreakdown).map(([k, v]) => [k, round(v ?? 0)]),
      ),
    },
    guidance: {
      viralAmpMultiplier: viralAmp > 1 ? viralAmp : undefined,
      faction: options?.faction,
      factionMultiplier: factionMultiplier !== 1 ? factionMultiplier : undefined,
      notes,
    },
  };
}

function round(n: number, digits = 1): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

export function formatDpsEstimate(estimate: DpsEstimate): string {
  const lines = [
    `## ${estimate.weaponName} (${estimate.weaponClass}) — modded DPS estimate`,
    `Mods applied (${estimate.modsApplied.length}): ${estimate.modsApplied.join(", ") || "(none)"}`,
    estimate.unknownMods.length
      ? `Unmodeled mods: ${estimate.unknownMods.join(", ")}`
      : "",
    "",
    "Unmodded:",
    `• Damage/shot (avg crit): ${estimate.unmodded.damagePerShot}`,
    `• Burst DPS: ${estimate.unmodded.burstDps}`,
    `• Sustained DPS: ${estimate.unmodded.sustainedDps}`,
    "",
    "Modded:",
    `• Damage/shot (avg crit × MS × faction/viral): ${estimate.modded.damagePerShot}`,
    `• Avg crit mult: ${estimate.modded.avgCritMultiplier} · Multishot: ${estimate.modded.multishot} · Fire rate: ${estimate.modded.fireRate}`,
    `• Status chance: ${(estimate.modded.statusChance * 100).toFixed(1)}%`,
    `• Burst DPS: ${estimate.modded.burstDps}`,
    `• Sustained DPS: ${estimate.modded.sustainedDps}`,
  ];
  const elems = Object.entries(estimate.modded.elementalBreakdown);
  if (elems.length) {
    lines.push(
      `• Elemental added: ${elems.map(([k, v]) => `${k} ${v}`).join(", ")}`,
    );
  }
  if (estimate.guidance?.notes?.length) {
    lines.push("", "Notes:", ...estimate.guidance.notes.map((n) => `• ${n}`));
  }
  return lines.filter(Boolean).join("\n");
}
