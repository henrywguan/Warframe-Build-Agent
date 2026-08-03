/**
 * Curated Warframe Wiki pages for offline mechanics + resource recall.
 * Titles should resolve via wiki redirects where possible.
 */

export type MechanicsTopicKind =
  | "damage"
  | "status"
  | "defense"
  | "combat"
  | "faction"
  | "progression"
  | "resource"
  | "modding"
  | "mode";

export type MechanicsTopic = {
  /** Stable pack id */
  id: string;
  /** Wiki page title to fetch */
  title: string;
  kind: MechanicsTopicKind;
  /** Extra search aliases for local lookup */
  aliases: string[];
  /** Why this page is in the pack */
  summary: string;
};

/** Core pages that let a local chatbot answer elemental stacking / armor / shields / SP. */
export const MECHANICS_TOPICS: MechanicsTopic[] = [
  // Damage & elements
  {
    id: "damage",
    title: "Damage",
    kind: "damage",
    aliases: ["damage types", "damage 2.0", "damage 3.0", "ips", "elemental damage"],
    summary: "Damage system overview, type chart, and stacking rules.",
  },
  {
    id: "damage-viral",
    title: "Damage/Viral Damage",
    kind: "damage",
    aliases: ["viral", "viral proc", "viral status", "cold toxin"],
    summary: "Viral damage and health-amp status effect.",
  },
  {
    id: "damage-corrosive",
    title: "Damage/Corrosive Damage",
    kind: "damage",
    aliases: ["corrosive", "corrosive proc", "armor strip", "electricity toxin"],
    summary: "Corrosive damage and armor-strip status effect.",
  },
  {
    id: "damage-magnetic",
    title: "Damage/Magnetic Damage",
    kind: "damage",
    aliases: ["magnetic", "magnetic proc", "cold electricity", "shield strip"],
    summary: "Magnetic damage and shield-disruption status effect.",
  },
  {
    id: "damage-radiation",
    title: "Damage/Radiation Damage",
    kind: "damage",
    aliases: ["radiation", "rad", "radiation proc", "heat electricity", "confusion"],
    summary: "Radiation damage and confusion / friendly-fire status.",
  },
  {
    id: "damage-heat",
    title: "Damage/Heat Damage",
    kind: "damage",
    aliases: ["heat", "fire", "ignite", "heat proc"],
    summary: "Heat damage and ignite status.",
  },
  {
    id: "damage-cold",
    title: "Damage/Cold Damage",
    kind: "damage",
    aliases: ["cold", "freeze", "cold proc", "slow"],
    summary: "Cold damage and slow / freeze status.",
  },
  {
    id: "damage-toxin",
    title: "Damage/Toxin Damage",
    kind: "damage",
    aliases: ["toxin", "poison", "toxin proc", "bypass shields"],
    summary: "Toxin damage (bypasses shields) and DoT status.",
  },
  {
    id: "damage-electricity",
    title: "Damage/Electricity Damage",
    kind: "damage",
    aliases: ["electricity", "electric", "shock", "electricity proc"],
    summary: "Electricity damage and chain / stun status.",
  },
  {
    id: "damage-gas",
    title: "Damage/Gas Damage",
    kind: "damage",
    aliases: ["gas", "gas proc", "heat toxin"],
    summary: "Gas damage and AoE toxin-cloud status.",
  },
  {
    id: "damage-blast",
    title: "Damage/Blast Damage",
    kind: "damage",
    aliases: ["blast", "blast proc", "heat cold", "knockdown"],
    summary: "Blast damage and knockdown / stagger status.",
  },
  {
    id: "damage-impact",
    title: "Damage/Impact Damage",
    kind: "damage",
    aliases: ["impact", "impact proc", "stagger"],
    summary: "Impact physical damage and stagger.",
  },
  {
    id: "damage-puncture",
    title: "Damage/Puncture Damage",
    kind: "damage",
    aliases: ["puncture", "puncture proc", "weakened"],
    summary: "Puncture physical damage and damage vulnerability.",
  },
  {
    id: "damage-slash",
    title: "Damage/Slash Damage",
    kind: "damage",
    aliases: ["slash", "slash proc", "bleed", "hemorrhage"],
    summary: "Slash physical damage and bleed DoT.",
  },
  {
    id: "status-effect",
    title: "Status Effect",
    kind: "status",
    aliases: ["status", "status chance", "procs", "proc", "status stacking"],
    summary: "How status chance, procs, and stacking work.",
  },

  // Defense & combat math
  {
    id: "armor",
    title: "Armor",
    kind: "defense",
    aliases: ["armor rating", "dr", "damage reduction armor", "ferrite", "alloy armor"],
    summary: "Armor formulas and strip interactions.",
  },
  {
    id: "shield",
    title: "Shield",
    kind: "defense",
    aliases: ["shields", "shield gating", "proto shield", "shield recharge"],
    summary: "Shields, gating, and magnetic interactions.",
  },
  {
    id: "health",
    title: "Health",
    kind: "defense",
    aliases: ["hp", "hit points", "cloned flesh", "flesh", "fossilized"],
    summary: "Health types and viral interactions.",
  },
  {
    id: "damage-reduction",
    title: "Damage Reduction",
    kind: "defense",
    aliases: ["dr stacking", "damage resistance", "mitigation"],
    summary: "Player/enemy damage reduction stacking.",
  },
  {
    id: "critical-hit",
    title: "Critical Hit",
    kind: "combat",
    aliases: ["crit", "critical chance", "critical multiplier", "orange crit", "red crit"],
    summary: "Critical hits, tiers, and multipliers.",
  },
  {
    id: "enemy-level-scaling",
    title: "Enemy Level Scaling",
    kind: "combat",
    aliases: ["enemy scaling", "level scaling", "eximus scaling"],
    summary: "How enemy health/armor/shields scale with level.",
  },
  {
    id: "enemy-body-parts",
    title: "Enemy Body Parts",
    kind: "combat",
    aliases: ["weak spot", "headshot", "body part multipliers"],
    summary: "Body-part hit multipliers / weak spots.",
  },
  {
    id: "faction-damage-bonus",
    title: "Faction Damage Bonus",
    kind: "combat",
    aliases: ["faction damage", "bane mods", "smite", "expel"],
    summary: "Faction damage multipliers and bane mods.",
  },

  // Factions
  {
    id: "faction-grineer",
    title: "Grineer",
    kind: "faction",
    aliases: ["grineer faction", "cloned flesh", "ferrite armor"],
    summary: "Grineer faction overview (armor-heavy).",
  },
  {
    id: "faction-corpus",
    title: "Corpus",
    kind: "faction",
    aliases: ["corpus faction", "shields corpus", "robotic"],
    summary: "Corpus faction overview (shield-heavy).",
  },
  {
    id: "faction-infested",
    title: "Infested",
    kind: "faction",
    aliases: ["infested faction", "infestation"],
    summary: "Infested faction overview.",
  },
  {
    id: "faction-orokin",
    title: "Orokin",
    kind: "faction",
    aliases: ["orokin faction", "corrupted"],
    summary: "Orokin / Corrupted faction overview.",
  },
  {
    id: "faction-sentient",
    title: "Sentient",
    kind: "faction",
    aliases: ["sentients", "adaptation sentient"],
    summary: "Sentient faction and adaptation.",
  },
  {
    id: "faction-murmur",
    title: "The Murmur",
    kind: "faction",
    aliases: ["murmur", "indifferent faction"],
    summary: "The Murmur faction overview.",
  },
  {
    id: "faction-techrot",
    title: "Techrot",
    kind: "faction",
    aliases: ["techrot faction", "1999 enemies"],
    summary: "Techrot faction overview.",
  },

  // Modes / progression
  {
    id: "steel-path",
    title: "The Steel Path",
    kind: "mode",
    aliases: ["steel path", "sp", "steel path rewards"],
    summary: "Steel Path modifiers and rewards.",
  },
  {
    id: "archon-hunt",
    title: "Archon Hunt",
    kind: "mode",
    aliases: ["archon", "archon shards", "weekly archon"],
    summary: "Archon Hunt weekly content.",
  },
  {
    id: "mastery-rank",
    title: "Mastery Rank",
    kind: "progression",
    aliases: ["mr", "mastery", "affinity mastery"],
    summary: "Mastery Rank progression.",
  },
  {
    id: "affinity",
    title: "Affinity",
    kind: "progression",
    aliases: ["xp", "affinity share", "affinity range"],
    summary: "Affinity / XP rules.",
  },

  // Modding + resources
  {
    id: "mod",
    title: "Mod",
    kind: "modding",
    aliases: ["mods", "modding", "mod capacity", "drain"],
    summary: "Mods and capacity basics.",
  },
  {
    id: "arcane-enhancement",
    title: "Arcane Enhancement",
    kind: "modding",
    aliases: ["arcanes", "arcane", "arcane rank"],
    summary: "Arcane enhancements.",
  },
  {
    id: "forma",
    title: "Forma",
    kind: "modding",
    aliases: ["formas", "polarization forma"],
    summary: "Forma item and uses.",
  },
  {
    id: "polarization",
    title: "Polarization",
    kind: "modding",
    aliases: ["polarize", "polarity matching", "umba polarity"],
    summary: "Weapon/Warframe polarization rules.",
  },
  {
    id: "resource-kuva",
    title: "Kuva (Resource)",
    kind: "resource",
    aliases: ["kuva", "kuva farm"],
    summary: "Kuva resource.",
  },
  {
    id: "resource-endo",
    title: "Endo",
    kind: "resource",
    aliases: ["endo farm", "mod fusion"],
    summary: "Endo resource for mod ranking.",
  },
  {
    id: "void-relic",
    title: "Void Relic",
    kind: "resource",
    aliases: ["relics", "lith", "meso", "neo", "axi", "requiem relic", "refinement"],
    summary: "Void Relics and refinement.",
  },
];

export function slugifyTopicId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
