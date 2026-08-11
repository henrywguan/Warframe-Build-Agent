/** Forma / polarity planner — heuristic capacity estimate, not exact mod-by-mod planning. */

export type FormaPlanInput = {
  /** Total mod capacity needed for the planned build. */
  capacityNeeded: number;
  /** Current capacity after aura / stance / exilus (default 60 on rank-30 gear). */
  currentCapacity?: number;
  /** Count of mods whose polarity already matches the slot. */
  matchingPolarities?: number;
};

export type FormaPlan = {
  input: FormaPlanInput;
  deficit: number;
  estimatedForma: number;
  matchingPolarities: number;
};

export function estimateForma(input: FormaPlanInput): FormaPlan {
  const current = input.currentCapacity ?? 60;
  const needed = Math.max(0, input.capacityNeeded);
  const deficit = Math.max(0, needed - current);
  const estimatedForma = Math.max(0, Math.ceil(deficit / 2));
  const matchingPolarities = Math.max(0, input.matchingPolarities ?? 0);

  return {
    input: { ...input, currentCapacity: current, capacityNeeded: needed },
    deficit,
    estimatedForma,
    matchingPolarities,
  };
}

export function formatFormaPlan(input: FormaPlanInput): string {
  const plan = estimateForma(input);
  const lines = [
    "Forma plan (heuristic · offline)",
    "",
    `Capacity needed: ${plan.input.capacityNeeded}`,
    `Current capacity: ${plan.input.currentCapacity}`,
    `Deficit: ${plan.deficit}`,
    `Estimated Forma: ${plan.estimatedForma} (ceil(deficit / 2))`,
  ];
  if (plan.matchingPolarities > 0) {
    lines.push(`Matching polarities: ${plan.matchingPolarities} (saves capacity vs mismatched slots)`);
  }
  lines.push(
    "",
    "Polarity matching halves mod drain on a matching slot — plan slots before spending Forma.",
    "Community build forma counts: npm run knowledge -- builds \"<item>\"",
  );
  return lines.join("\n");
}
