/**
 * Tier 1–3 web slash helpers — isolated from root src/ (no ../../src imports).
 */

import { lookupLocalKnowledge } from "@/lib/local-knowledge";
import { packFarmLookup } from "@/lib/pack-commands";

export type EhpInput = {
  health: number;
  shields: number;
  armor: number;
  damageReduction?: number;
  overguard?: number;
  adaptationStacks?: number;
};

export type FormaPlanInput = {
  capacityNeeded: number;
  currentCapacity?: number;
  matchingPolarities?: number;
};

type RelicRefinement = "Intact" | "Exceptional" | "Flawless" | "Radiant";
type RelicRarity = "common" | "uncommon" | "rare";

const REFINEMENT_ODDS: Record<
  RelicRefinement,
  Record<RelicRarity, number>
> = {
  Intact: { common: 0.25, uncommon: 0.11, rare: 0.02 },
  Exceptional: { common: 0.27, uncommon: 0.13, rare: 0.04 },
  Flawless: { common: 0.29, uncommon: 0.16, rare: 0.07 },
  Radiant: { common: 0.34, uncommon: 0.22, rare: 0.16 },
};

const MOD_HINT =
  /\b(primed|umbral|aug(?:ment)?|continuity|flow|stretch|intensify|vitality|steel fiber|point blank|hornet strike|pressure point|serration|multishot|crit|status|pistol|rifle|shotgun|melee|aura|exilus|arcane|magus|virtuos|overextended|adaptation|blind rage|transient|galvanized|navigator|guardian|vigor|vital sense|split chamber|barrel diffusion|hunter|fox)\b/i;

const FRAME_HINT = /\b(warframe|prime)\b/i;

const WEAPON_NAME_HINT =
  /\b(ak|amp|arch(?:gun|melee|wing)?|atomos|boltor|braton|broken|cestra|coda|corinth|dex|dual|furis|glaive|gram|heliocor|hema|ignis|kuva|laetum|latron|miter|nukor|pox|quellor|rubico|sancti|soma|strun|synapse|tenet|tigris|torid|vasto|zarr|zaw|kitgun|phenmor|praedos|felarx|innate)\b/i;

const WEAPON_HINT =
  /\b(rifle|pistol|shotgun|melee|bow|launcher|blade|whip|nunchaku|gunblade|primary|secondary|sword|dagger|staff|polearm|machete|claws|fists|gauntlet|modular|incarnon|wraith|vandal)\b/i;

const SKIP_LINE =
  /^(owned|inventory|mods|weapons|warframes|items|---|---+|#+\s)/i;

function clampDr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.99, Math.max(0, value));
}

function adaptationDr(stacks: number): number {
  if (!Number.isFinite(stacks) || stacks <= 0) return 0;
  return Math.min(0.9, stacks * 0.09);
}

function getFlag(args: string[], flag: string): string | undefined {
  const lower = flag.toLowerCase();
  const i = args.findIndex((a) => a.toLowerCase() === lower);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

function getNumberFlag(args: string[], flag: string): number | undefined {
  const raw = getFlag(args, flag);
  if (raw == null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function positionalArgs(args: string[], flags: string[]): string[] {
  const skip = new Set(flags.map((f) => f.toLowerCase()));
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (skip.has(arg.toLowerCase())) {
      i++;
      continue;
    }
    out.push(arg);
  }
  return out;
}

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
  const rows = (Object.keys(REFINEMENT_ODDS) as RelicRefinement[]).map(
    (tier) => {
      const odds = REFINEMENT_ODDS[tier];
      const mark = tier === highlight ? " ←" : "";
      return `| ${tier}${mark} | ${(odds.common * 100).toFixed(0)}% | ${(odds.uncommon * 100).toFixed(0)}% | ${(odds.rare * 100).toFixed(0)}% |`;
    },
  );
  return [header, sep, ...rows].join("\n");
}

function splitInventoryLines(raw: string): string[] {
  return raw
    .split(/\r?\n|,|;/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && !SKIP_LINE.test(line));
}

function classifyToken(token: string): "frames" | "weapons" | "mods" | "unknown" {
  if (MOD_HINT.test(token)) return "mods";
  if (WEAPON_HINT.test(token) || WEAPON_NAME_HINT.test(token)) return "weapons";
  if (FRAME_HINT.test(token)) return "frames";
  if (/\bmod\b/i.test(token) || /\brank\s*\d/i.test(token)) return "mods";
  return "unknown";
}

export function formatEhpResult(input: EhpInput): string {
  const health = Math.max(0, input.health);
  const shields = Math.max(0, input.shields);
  const armor = input.armor;
  const overguard = Math.max(0, input.overguard ?? 0);
  const baseDr = clampDr(input.damageReduction ?? 0);
  const adaptDr = adaptationDr(input.adaptationStacks ?? 0);
  const combinedDr = clampDr(1 - (1 - baseDr) * (1 - adaptDr));
  const armorMult = 1 + armor / 300;
  const healthEhp =
    combinedDr < 1 ? (health * armorMult) / (1 - combinedDr) : health * armorMult;
  const totalEhp = healthEhp + shields + overguard;

  const lines = [
    "Effective HP estimate (offline · not a full simulator)",
    "",
    `Health EHP: ${Math.round(healthEhp).toLocaleString()} (${health} HP × ${armorMult.toFixed(2)} armor × DR)`,
    `Shields: ${Math.round(shields).toLocaleString()}`,
  ];
  if (overguard > 0) {
    lines.push(`Overguard: ${Math.round(overguard).toLocaleString()}`);
  }
  lines.push(`Total EHP: ${Math.round(totalEhp).toLocaleString()}`);
  if (combinedDr > 0) {
    lines.push(`Combined DR: ${(combinedDr * 100).toFixed(1)}%`);
  }
  lines.push(
    "",
    "Note: armor uses 1 + armor/300 (negative armor, faction mods, and ability buffs not modeled).",
    "Shields and overguard are added flat; shield gate and recovery are not included.",
    "",
    formatCitationFooter(),
  );
  return lines.join("\n");
}

export function formatFormaResult(input: FormaPlanInput): string {
  const current = input.currentCapacity ?? 60;
  const needed = Math.max(0, input.capacityNeeded);
  const deficit = Math.max(0, needed - current);
  const estimatedForma = Math.max(0, Math.ceil(deficit / 2));
  const matchingPolarities = Math.max(0, input.matchingPolarities ?? 0);

  const lines = [
    "Forma plan (heuristic · offline)",
    "",
    `Capacity needed: ${needed}`,
    `Current capacity: ${current}`,
    `Deficit: ${deficit}`,
    `Estimated Forma: ${estimatedForma} (ceil(deficit / 2))`,
  ];
  if (matchingPolarities > 0) {
    lines.push(
      `Matching polarities: ${matchingPolarities} (saves capacity vs mismatched slots)`,
    );
  }
  lines.push(
    "",
    "Polarity matching halves mod drain on a matching slot — plan slots before spending Forma.",
    "Community build forma counts: /build <item>",
    "",
    formatCitationFooter(),
  );
  return lines.join("\n");
}

export function runEhpSlash(args: string[]): string {
  const health = getNumberFlag(args, "--health");
  const shields = getNumberFlag(args, "--shields");
  const armor = getNumberFlag(args, "--armor");
  if (health == null || shields == null || armor == null) {
    return [
      "Usage: /ehp --health N --shields N --armor N [--dr 0.75] [--overguard N] [--adaptation 0-10]",
      "Example: /ehp --health 500 --shields 300 --armor 300 --dr 0.75 --adaptation 10",
    ].join("\n");
  }
  return formatEhpResult({
    health,
    shields,
    armor,
    damageReduction: getNumberFlag(args, "--dr"),
    overguard: getNumberFlag(args, "--overguard"),
    adaptationStacks: getNumberFlag(args, "--adaptation"),
  });
}

export function runFormaSlash(args: string[]): string {
  const needed = getNumberFlag(args, "--needed");
  if (needed == null) {
    return [
      "Usage: /forma --needed N [--current 60] [--matching N]",
      "Example: /forma --needed 74 --current 60 --matching 4",
    ].join("\n");
  }
  return formatFormaResult({
    capacityNeeded: needed,
    currentCapacity: getNumberFlag(args, "--current"),
    matchingPolarities: getNumberFlag(args, "--matching"),
  });
}

export async function runRelicSlash(
  query: string,
  args: string[] = [],
): Promise<string> {
  const refinement = normalizeRefinement(getFlag(args, "--refinement"));
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
    trimmed
      ? `Use /knowledge ${trimmed} for drop tables and vault status.`
      : "Use /knowledge <relic or part name> for drop tables and vault status.",
    "Live fissures: /fissures · Trade prices: /market <slug> · /slug <item name>",
    "",
    formatCitationFooter(),
  );

  const base = lines.join("\n");
  if (!trimmed) return base;

  try {
    const lookup = await lookupLocalKnowledge(trimmed);
    if (lookup && !lookup.includes("No local knowledge")) {
      return [base, "", "---", "", "### Pack lookup", lookup].join("\n");
    }
  } catch {
    // lookup optional
  }
  return base;
}

export function runInventorySlash(text: string): string {
  if (!text.trim()) {
    return [
      "Usage: /inventory <pasted list>",
      "Paste owned frames, weapons, and mods (comma or newline separated).",
      "Example: /inventory Soma Prime, Ignis Wraith, Primed Flow, Vitality",
    ].join("\n");
  }

  const parsed = {
    frames: [] as string[],
    weapons: [] as string[],
    mods: [] as string[],
    unknown: [] as string[],
  };
  const seen = new Set<string>();

  for (const line of splitInventoryLines(text)) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parsed[classifyToken(line)].push(line);
  }

  const lines = [
    "Inventory parse (heuristic · session-only)",
    "",
    `Warframes (${parsed.frames.length}): ${parsed.frames.slice(0, 12).join(", ") || "—"}`,
    `Weapons (${parsed.weapons.length}): ${parsed.weapons.slice(0, 12).join(", ") || "—"}`,
    `Mods (${parsed.mods.length}): ${parsed.mods.slice(0, 12).join(", ") || "—"}`,
    `Unknown (${parsed.unknown.length}): ${parsed.unknown.slice(0, 8).join(", ") || "—"}`,
    "",
    "Tip: save a player profile with npm run knowledge -- profile-set --mr N …",
    "Or use /profile for the web stub.",
  ];
  return lines.join("\n");
}

export function runExplainStub(topic?: string): string {
  if (!topic?.trim()) {
    return [
      "Usage: /explain <topic>",
      "Examples:",
      "• /explain damage types",
      "• /explain status effect",
      "• /explain armor",
      "",
      "For full mechanics digests use /knowledge <topic> (offline pack, no LLM).",
    ].join("\n");
  }
  return [
    `Mechanics explain — ${topic.trim()}`,
    "",
    "This stub points to the offline pack first (patch-sensitive mechanics).",
    `Try: /knowledge ${topic.trim()}`,
    "",
    "Common topics: damage types, status effect, armor, shields, overguard, factions, forma, void relic.",
    "Plain-language follow-ups work when the LLM is enabled.",
    "",
    formatCitationFooter(),
  ].join("\n");
}

const OPTIMIZE_MODES: Record<string, { title: string; tips: string[] }> = {
  archon: {
    title: "Archon Hunt",
    tips: [
      "Frame: survivable caster or helminth-boosted DPS (Wisp, Mag, Revenant, Voruna).",
      "Primary: high-status / armor strip (Kuva Bramma, Cedo, Phenmor).",
      "Operator: Void Sling for mobility; amp for boss weakpoints if needed.",
      "Arcanes: Molt Augmented / Energize on frame; Primary/Secondary Merciless on guns.",
    ],
  },
  sp: {
    title: "Steel Path",
    tips: [
      "Bring enemy radar + armor strip or viral/corrosive setup.",
      "Galvanized mods + Hunter Munitions or Archon Shards for scaling.",
      "Companion: Smeeta/Vauban kubrow for loot; Helminth Charger for armor strip.",
      "Arcane Energize + survivability (Adaptation, Umbral, Rolling Guard).",
    ],
  },
  netracell: {
    title: "Netracell",
    tips: [
      "High burst DPS + mobility; watch eximus and heavy units.",
      "Incarnon primaries or fast secondaries for procs.",
      "Bring armor/shield strip and crowd control for tight corridors.",
    ],
  },
  da: {
    title: "Deep Archimedea",
    tips: [
      "All-rounder loadout — no mission-specific modding between stages.",
      "Strong CC + armor strip; avoid brittle one-trick builds.",
      "Check weekly modifiers before committing forma.",
    ],
  },
  eidolon: {
    title: "Eidolon hunt",
    tips: [
      "Operator amp (223/729) + Virtuos Strike/Shadow for limbs.",
      "Frame: Trinity/Harrow/Chroma support; DPS frames for Terry/Gara.",
      "Lure management and energy economy matter more than raw frame DPS.",
      "See amp-setup skill for detailed amp parts.",
    ],
  },
  pt: {
    title: "Profit-taker",
    tips: [
      "Phase 1–3: high-status primary + Shattering Impact secondary (catch-a-moive).",
      "Phase 4: elemental match to weakpoints; bring ammo/energy pads.",
      "Frame: Mesa, Baruuk, or Nova speed strategies; Decoy for magnet.",
    ],
  },
  arb: {
    title: "Arbitration",
    tips: [
      "Check /arbitration for today's node and type.",
      "Long rotations: tanky frame + enemy radar + life support efficiency.",
      "Reward path: Endo vs mods vs Ayatan — bring appropriate loadout.",
      "Steel Path-ready AOE and index/collection frames for certain nodes.",
    ],
  },
  circuit: {
    title: "Duviri Circuit",
    tips: [
      "Weekly rotating frames/weapons — check /cycles for Duviri state.",
      "Generalist SP loadout; bring forma-flexible mods.",
      "Spoil choices: pick missing parts over duplicates when possible.",
    ],
  },
};

export function runOptimizeStub(mode?: string): string {
  const key = (mode ?? "").trim().toLowerCase();
  if (!key) {
    return [
      "Usage: /optimize <mode>",
      "Modes: archon | sp | netracell | da | eidolon | pt | arb | circuit",
      "Example: /optimize sp",
      "",
      "Stub tips only — ask in plain language for full loadout packages.",
    ].join("\n");
  }

  const entry = OPTIMIZE_MODES[key];
  if (!entry) {
    return [
      `Unknown optimize mode: ${mode}`,
      "",
      "Modes: archon | sp | netracell | da | eidolon | pt | arb | circuit",
    ].join("\n");
  }

  return [
    `Loadout optimize — ${entry.title} (stub)`,
    "",
    ...entry.tips.map((tip) => `• ${tip}`),
    "",
    "Full packages: use loadout-optimize / steel-path-loadout skills in Cursor.",
    "Builds: /build <item> · Compare: /compare · DPS: /dps <weapon>",
    "",
    formatCitationFooter(),
  ].join("\n");
}

export async function runFarmVsBuySlash(item: string): Promise<string> {
  const query = item.trim();
  if (!query) {
    return [
      "Usage: /farm-vs-buy <item>",
      "Aliases: /buyvsfarm",
      "Example: /farm-vs-buy Mirage Prime Neuroptics",
    ].join("\n");
  }

  const farm = await packFarmLookup(query);
  const slugHint = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  return [
    farm,
    "",
    "---",
    "",
    "Farm vs buy (offline · check live prices before deciding)",
    "",
    `Market check: /market ${slugHint || "<slug>"}`,
    `Resolve slug: /slug ${query}`,
    "Daily price changes: /market-changes",
    "",
    "Rule of thumb: buy cheap vaulted parts; farm relics when fissures align or you enjoy the route.",
    "",
    formatCitationFooter(),
  ].join("\n");
}

export function formatCitationFooter(): string {
  return [
    "Patch-sensitive: rankings, prices, and live timers change with hotfixes — verify before trading or forma spending.",
    "Sources: offline pack (/knowledge) · live status (/summary) · market (/market) · patches (/patches).",
  ].join("\n");
}

/** Query text for /relic after stripping known flags. */
export function relicPositionalArgs(args: string[]): string {
  return positionalArgs(args, ["--refinement"]).join(" ").trim();
}
