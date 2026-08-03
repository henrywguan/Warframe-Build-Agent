import { fetchJson } from "./http.js";
import type { CatalogItem, KnowledgeItemKind } from "./types.js";

const WFCD_WARFRAMES = "https://api.warframestat.us/warframes?language=en";
const WFCD_WEAPONS = "https://api.warframestat.us/weapons?language=en";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function kindFor(frameOrWeapon: "frame" | "weapon", row: Record<string, unknown>): KnowledgeItemKind {
  if (frameOrWeapon === "frame") {
    return row.category === "Archwing" ? "archwing" : "warframe";
  }
  return "weapon";
}

function slimFrame(row: Record<string, unknown>): CatalogItem {
  const name = String(row.name || "unknown");
  const abilities = Array.isArray(row.abilities)
    ? row.abilities.map((ability) => {
        const a = ability as Record<string, unknown>;
        return {
          name: typeof a.name === "string" ? a.name : undefined,
          description: typeof a.description === "string" ? a.description : undefined,
        };
      })
    : undefined;

  return {
    id: slugify(name),
    name,
    kind: kindFor("frame", row),
    category: String(row.category || ""),
    type: typeof row.type === "string" ? row.type : undefined,
    isPrime: Boolean(row.isPrime),
    masteryReq: typeof row.masteryReq === "number" ? row.masteryReq : undefined,
    description: typeof row.description === "string" ? row.description : undefined,
    wikiaUrl: typeof row.wikiaUrl === "string" ? row.wikiaUrl : undefined,
    abilities,
    stats: {
      health: row.health,
      shield: row.shield,
      armor: row.armor,
      power: row.power,
      sprintSpeed: row.sprintSpeed,
      polarities: row.polarities,
      aura: row.aura,
      releaseDate: row.releaseDate,
      introduced: row.introduced,
    },
  };
}

function slimWeapon(row: Record<string, unknown>): CatalogItem {
  const name = String(row.name || "unknown");
  return {
    id: slugify(name),
    name,
    kind: "weapon",
    category: String(row.category || ""),
    type: typeof row.type === "string" ? row.type : undefined,
    isPrime: Boolean(row.isPrime),
    masteryReq: typeof row.masteryReq === "number" ? row.masteryReq : undefined,
    description: typeof row.description === "string" ? row.description : undefined,
    wikiaUrl: typeof row.wikiaUrl === "string" ? row.wikiaUrl : undefined,
    stats: {
      criticalChance: row.criticalChance,
      criticalMultiplier: row.criticalMultiplier,
      procChance: row.procChance,
      fireRate: row.fireRate,
      accuracy: row.accuracy,
      magazineSize: row.magazineSize,
      reloadTime: row.reloadTime,
      disposition: row.disposition,
      damage: row.damage,
      totalDamage: row.totalDamage,
      polarities: row.polarities,
      tags: row.tags,
      masteryReq: row.masteryReq,
    },
  };
}

export async function pullCatalog(options?: {
  includeArchwing?: boolean;
}): Promise<CatalogItem[]> {
  const includeArchwing = options?.includeArchwing ?? false;
  const [frames, weapons] = await Promise.all([
    fetchJson<Record<string, unknown>[]>(WFCD_WARFRAMES),
    fetchJson<Record<string, unknown>[]>(WFCD_WEAPONS),
  ]);

  const frameItems = frames
    .map(slimFrame)
    .filter((item) => includeArchwing || item.kind === "warframe");

  const weaponItems = weapons
    .map(slimWeapon)
    // Focus arsenal-usable weapons; keep archguns etc. but drop odd empty names
    .filter((item) => Boolean(item.name?.trim()));

  const byId = new Map<string, CatalogItem>();
  for (const item of [...frameItems, ...weaponItems]) {
    // Prefer first occurrence; disambiguate collisions
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
      continue;
    }
    const alt = `${item.id}-${item.kind}`;
    byId.set(alt, { ...item, id: alt });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
