/** Void Relic refinement odds and expected-value guidance. */

import { lookupLocalKnowledge } from "./query.js";

export type RelicRefinement = "Intact" | "Exceptional" | "Flawless" | "Radiant";

export type RelicRarity = "common" | "uncommon" | "rare";

/** Per-player drop chance by refinement tier (wiki-standard odds). */
export const REFINEMENT_ODDS: Record<
  RelicRefinement,
  Record<RelicRarity, number>
> = {
  Intact: { common: 0.25, uncommon: 0.11, rare: 0.02 },
  Exceptional: { common: 0.27, uncommon: 0.13, rare: 0.04 },
  Flawless: { common: 0.29, uncommon: 0.16, rare: 0.07 },
  Radiant: { common: 0.34, uncommon: 0.22, rare: 0.16 },
};

export type RelicAdviceOptions = {
  refinement?: string;
  repoRoot?: string;
};

function normalizeRefinement(raw?: string): RelicRefinement | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  const map: Record<string, RelicRefinement> = {
    intact: "Intact",
    exceptional: "Exceptional",
    flawless: "Flawless",
    radiant: "Radiant",
    rad: "Radiant",
  };
  return map[key];
}

function formatOddsTable(highlight?: RelicRefinement): string {
  const header = "| Refinement | Common | Uncommon | Rare |";
  const sep = "| --- | ---: | ---: | ---: |";
  const rows = (Object.keys(REFINEMENT_ODDS) as RelicRefinement[]).map((tier) => {
    const odds = REFINEMENT_ODDS[tier];
    const mark = tier === highlight ? " ←" : "";
    return `| ${tier}${mark} | ${(odds.common * 100).toFixed(0)}% | ${(odds.uncommon * 100).toFixed(0)}% | ${(odds.rare * 100).toFixed(0)}% |`;
  });
  return [header, sep, ...rows].join("\n");
}

export function formatRelicAdvice(query: string, options?: RelicAdviceOptions): string {
  const refinement = normalizeRefinement(options?.refinement);
  const trimmed = query.trim();
  const lines = [
    "Void Relic advice (offline odds · not live fissure pool)",
    trimmed ? `Query: ${trimmed}` : "",
    "",
    "### Refinement drop odds (per player)",
    formatOddsTable(refinement),
    "",
  ].filter(Boolean);

  if (refinement) {
    const odds = REFINEMENT_ODDS[refinement];
    lines.push(
      `Selected: **${refinement}** — rare ${(odds.rare * 100).toFixed(0)}%, uncommon ${(odds.uncommon * 100).toFixed(0)}%, common ${(odds.common * 100).toFixed(0)}%.`,
      "",
    );
  }

  lines.push(
    "### Radshare tips",
    "- Host **Radiant** when you need the rare part; join radshares at matching tier.",
    "- Duplicate protection does not apply across squad members.",
    "- For personal opening, lower refinement preserves more relics for trading.",
    "",
    "### Specific parts & relic names",
    "Use the offline pack for drop tables and vault status:",
    `  npm run knowledge -- lookup "${trimmed || "Void Relic"}"`,
    "Live fissures: npm run wf -- fissures",
    "Trade prices: npm run market -- price <slug>",
  );

  return lines.join("\n");
}

/** Async variant that prepends a best-effort pack lookup when a query is provided. */
export async function formatRelicAdviceWithLookup(
  query: string,
  options?: RelicAdviceOptions,
): Promise<string> {
  const base = formatRelicAdvice(query, options);
  if (!query.trim()) return base;

  try {
    const lookup = await lookupLocalKnowledge(query, { repoRoot: options?.repoRoot });
    if (lookup && !lookup.includes("No local knowledge")) {
      return [base, "", "---", "", "### Pack lookup", lookup].join("\n");
    }
  } catch {
    // lookup optional
  }
  return base;
}
