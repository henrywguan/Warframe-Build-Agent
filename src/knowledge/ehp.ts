/** Simple EHP estimator — not a full survivability simulator. */

export type EhpInput = {
  health: number;
  shields: number;
  armor: number;
  /** Fractional damage reduction, e.g. 0.75 for 75% DR. */
  damageReduction?: number;
  overguard?: number;
  /** Approximate Adaptation stacks (0–10). Adds ~9% DR per stack, capped at 90%. */
  adaptationStacks?: number;
};

export type EhpEstimate = {
  input: EhpInput;
  healthEhp: number;
  shieldTotal: number;
  overguardTotal: number;
  totalEhp: number;
  combinedDr: number;
};

function clampDr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.99, Math.max(0, value));
}

function adaptationDr(stacks: number): number {
  if (!Number.isFinite(stacks) || stacks <= 0) return 0;
  return Math.min(0.9, stacks * 0.09);
}

/** Armor multiplier uses the standard Warframe formula: 1 + armor/300 (ignores negative armor edge cases). */
export function estimateEhp(input: EhpInput): EhpEstimate {
  const health = Math.max(0, input.health);
  const shields = Math.max(0, input.shields);
  const armor = input.armor;
  const overguard = Math.max(0, input.overguard ?? 0);
  const baseDr = clampDr(input.damageReduction ?? 0);
  const adaptDr = adaptationDr(input.adaptationStacks ?? 0);
  const combinedDr = clampDr(1 - (1 - baseDr) * (1 - adaptDr));

  const armorMult = 1 + armor / 300;
  const healthEhp = combinedDr < 1 ? (health * armorMult) / (1 - combinedDr) : health * armorMult;
  const totalEhp = healthEhp + shields + overguard;

  return {
    input,
    healthEhp,
    shieldTotal: shields,
    overguardTotal: overguard,
    totalEhp,
    combinedDr,
  };
}

export function formatEhpEstimate(input: EhpInput): string {
  const est = estimateEhp(input);
  const lines = [
    "Effective HP estimate (offline · not a full simulator)",
    "",
    `Health EHP: ${Math.round(est.healthEhp).toLocaleString()} (${est.input.health} HP × ${(1 + est.input.armor / 300).toFixed(2)} armor × DR)`,
    `Shields: ${Math.round(est.shieldTotal).toLocaleString()}`,
  ];
  if (est.overguardTotal > 0) {
    lines.push(`Overguard: ${Math.round(est.overguardTotal).toLocaleString()}`);
  }
  lines.push(`Total EHP: ${Math.round(est.totalEhp).toLocaleString()}`);
  if (est.combinedDr > 0) {
    lines.push(`Combined DR: ${(est.combinedDr * 100).toFixed(1)}%`);
  }
  lines.push(
    "",
    "Note: armor uses 1 + armor/300 (negative armor, faction mods, and ability buffs not modeled).",
    "Shields and overguard are added flat; shield gate and recovery are not included.",
  );
  return lines.join("\n");
}
