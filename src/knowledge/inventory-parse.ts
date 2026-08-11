/** Parse pasted inventory / owned-gear lists into coarse categories. */

export type InventoryParseResult = {
  frames: string[];
  weapons: string[];
  mods: string[];
  unknown: string[];
};

const MOD_HINT =
  /\b(primed|umbral|aug(?:ment)?|continuity|flow|stretch|intensify|vitality|steel fiber|point blank|hornet strike|pressure point|serration|multishot|crit|status|pistol|rifle|shotgun|melee|aura|exilus|arcane|magus|virtuos|overextended|adaptation|blind rage|transient|galvanized|navigator|guardian|vigor|vital sense|split chamber|barrel diffusion|hunter|fox)\b/i;

const FRAME_HINT =
  /\b(warframe|prime)\b/i;

const WEAPON_NAME_HINT =
  /\b(ak|amp|arch(?:gun|melee|wing)?|atomos|boltor|braton|broken|cestra|coda|corinth|dex|dual|furis|glaive|gram|heliocor|hema|ignis|kuva|laetum|latron|miter|nukor|pox|quellor|rubico|sancti|soma|strun|synapse|tenet|tigris|torid|vasto|zarr|zaw|kitgun|phenmor|praedos|felarx|innate)\b/i;

const WEAPON_HINT =
  /\b(rifle|pistol|shotgun|melee|bow|launcher|blade|whip|nunchaku|gunblade|primary|secondary|sword|dagger|staff|polearm|machete|claws|fists|gauntlet|modular|incarnon|wraith|vandal)\b/i;

const SKIP_LINE =
  /^(owned|inventory|mods|weapons|warframes|items|---|---+|#+\s)/i;

function splitInventoryLines(raw: string): string[] {
  return raw
    .split(/\r?\n|,|;/)
    .map((line) => line.replace(/^[\s•\-*]+/, "").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && !SKIP_LINE.test(line));
}

function classifyToken(token: string): keyof InventoryParseResult {
  if (MOD_HINT.test(token)) return "mods";
  if (WEAPON_HINT.test(token) || WEAPON_NAME_HINT.test(token)) return "weapons";
  if (FRAME_HINT.test(token)) return "frames";
  if (/\bmod\b/i.test(token) || /\brank\s*\d/i.test(token)) return "mods";
  return "unknown";
}

export function parseInventory(raw: string): InventoryParseResult {
  const result: InventoryParseResult = {
    frames: [],
    weapons: [],
    mods: [],
    unknown: [],
  };
  const seen = new Set<string>();

  for (const line of splitInventoryLines(raw)) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result[classifyToken(line)].push(line);
  }

  return result;
}

export function formatInventoryParse(raw: string): string {
  const parsed = parseInventory(raw);
  const lines = [
    "Inventory parse (heuristic · session-only)",
    "",
    `Warframes (${parsed.frames.length}): ${parsed.frames.slice(0, 12).join(", ") || "—"}`,
    `Weapons (${parsed.weapons.length}): ${parsed.weapons.slice(0, 12).join(", ") || "—"}`,
    `Mods (${parsed.mods.length}): ${parsed.mods.slice(0, 12).join(", ") || "—"}`,
    `Unknown (${parsed.unknown.length}): ${parsed.unknown.slice(0, 8).join(", ") || "—"}`,
  ];
  if (parsed.frames.length + parsed.weapons.length + parsed.mods.length > 36) {
    lines.push("", "…truncated display; full lists available in JSON output.");
  }
  lines.push(
    "",
    "Tip: save a player profile with npm run knowledge -- profile-set --mr N …",
  );
  return lines.join("\n");
}
