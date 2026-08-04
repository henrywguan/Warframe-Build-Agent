import { readFile } from "node:fs/promises";
import path from "node:path";
import { knowledgeRoot } from "../paths.js";
import { resolveRepoRoot } from "../repo-root.js";
import type {
  CommonModsFile,
  CuratedMod,
  ModEffects,
  ResolvedModSet,
  WeaponClass,
} from "./types.js";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function loadCommonMods(repoRoot?: string): Promise<CommonModsFile> {
  const root = repoRoot ?? resolveRepoRoot();
  const filePath = path.join(knowledgeRoot(root), "dps", "common-mods.json");
  return JSON.parse(await readFile(filePath, "utf8")) as CommonModsFile;
}

export function findCuratedMod(
  mods: CuratedMod[],
  name: string,
  weaponClass: WeaponClass,
): CuratedMod | null {
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

export function resolveModSet(
  requested: string[],
  catalog: CuratedMod[],
  weaponClass: WeaponClass,
): ResolvedModSet {
  const applied: Array<{ name: string; effects: ModEffects }> = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  for (const name of requested) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    const hit = findCuratedMod(catalog, trimmed, weaponClass);
    if (!hit) {
      unknown.push(trimmed);
      continue;
    }
    applied.push({ name: hit.name, effects: hit.effects });
  }

  const totals: ResolvedModSet["totals"] = {
    baseDamage: 0,
    multishot: 0,
    critChance: 0,
    critDamage: 0,
    fireRate: 0,
    reload: 0,
    statusChance: 0,
    faction: 0,
    elemental: {},
  };

  for (const row of applied) {
    const e = row.effects;
    totals.baseDamage += e.baseDamage ?? 0;
    totals.multishot += e.multishot ?? 0;
    totals.critChance += e.critChance ?? 0;
    totals.critDamage += e.critDamage ?? 0;
    totals.fireRate += e.fireRate ?? 0;
    totals.reload += e.reload ?? 0;
    totals.statusChance += e.statusChance ?? 0;
    totals.faction += e.faction ?? 0;
    for (const [el, pct] of Object.entries(e.elemental ?? {})) {
      const key = el as keyof typeof totals.elemental;
      totals.elemental[key] = (totals.elemental[key] ?? 0) + (pct ?? 0);
    }
  }

  return { requested, applied, unknown, totals };
}

export function resolvePresetMods(
  file: CommonModsFile,
  presetName: string | undefined,
  weaponClass: WeaponClass,
): string[] | null {
  if (!presetName) return null;
  const key = normalize(presetName).replace(/\s+/g, "-");
  const direct = file.presets[presetName] || file.presets[key];
  if (direct) return [...direct.mods];

  // Auto-pick by class when user asks for "typical" / "standard".
  if (/typical|standard|default|viral.?heat|status|max.?damage|maximum/.test(key)) {
    if (weaponClass === "pistol") return [...(file.presets["pistol-viral-heat"]?.mods ?? [])];
    if (weaponClass === "shotgun") return [...(file.presets["shotgun-viral-heat"]?.mods ?? [])];
    return [...(file.presets["rifle-viral-heat"]?.mods ?? [])];
  }
  if (/viral.?electric|electric.?dps|beam/.test(key)) {
    return [
      ...(file.presets["rifle-viral-electric"]?.mods ??
        file.presets["rifle-viral-heat"]?.mods ??
        []),
    ];
  }
  if (/corrosive/.test(key)) {
    return [...(file.presets["rifle-corrosive-heat"]?.mods ?? [])];
  }
  if (/budget|beginner|accessible/.test(key)) {
    return [...(file.presets["rifle-budget"]?.mods ?? [])];
  }
  if (/raw|crit/.test(key)) {
    return [...(file.presets["rifle-raw-crit"]?.mods ?? [])];
  }
  return null;
}
