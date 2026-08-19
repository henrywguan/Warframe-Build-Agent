/**
 * Natural-language + screenshot → SavedBuild composition.
 * Catalog classifies Warframe / Primary / Secondary / Melee / Companion.
 */

import { classifyItemName, type ArsenalSlotKind } from "./arsenal-classify";
import type { ParsedLoadout } from "./loadout-compare";
import {
  type ArchonCrystal,
  type GearSlot,
  type SavedBuild,
  createEmptyBuild,
  emptyGear,
  formatBuildSummary,
  inferFocusSlot,
  splitList,
} from "./saved-builds";

const SAVE_INTENT =
  /\b(save|add|store|pin|keep)\b[\s\S]{0,40}\b(build|loadout|arsenal|card)\b|\b(build|loadout)\b[\s\S]{0,40}\b(save|add|store|to my (builds|arsenal))\b|\/save-build\b/i;

export function looksLikeSaveBuildRequest(text: string): boolean {
  return SAVE_INTENT.test(text.trim());
}

function parseCrystalEntries(raw: string): ArchonCrystal[] {
  return splitList(raw).map((entry) => {
    const tauforged = /tau/i.test(entry);
    const cleaned = entry.replace(/\btau(?:forged)?\b/gi, "").trim();
    const colorMatch = cleaned.match(
      /^(crimson|amber|azure|violet|topaz|emerald)\b/i,
    );
    const color = colorMatch?.[1]
      ? colorMatch[1][0]!.toUpperCase() + colorMatch[1].slice(1).toLowerCase()
      : "Crystal";
    const effect = colorMatch
      ? cleaned.slice(colorMatch[0].length).trim() || cleaned
      : cleaned;
    return { color, effect, ...(tauforged ? { tauforged: true as const } : {}) };
  });
}

function gear(name: string, mods: string[] = [], arcanes: string[] = []): GearSlot {
  return { name, mods, arcanes };
}

function applySlot(
  build: SavedBuild,
  slot: ArsenalSlotKind,
  name: string,
  mods: string[],
  arcanes: string[],
): SavedBuild {
  const g = gear(name, mods, arcanes);
  switch (slot) {
    case "warframe":
      return { ...build, warframe: g };
    case "primary":
      return { ...build, primary: g };
    case "secondary":
      return { ...build, secondary: g };
    case "melee":
      return { ...build, melee: g };
    case "companion":
      return { ...build, companion: g };
    default:
      // Unknown → prefer primary weapon slot if empty, else notes
      if (!build.primary.name) return { ...build, primary: g };
      if (!build.warframe.name) return { ...build, warframe: g };
      return {
        ...build,
        notes: [build.notes, `${name} (uncategorized)`].filter(Boolean).join("; "),
      };
  }
}

export type SaveBuildToolArgs = {
  name?: string;
  folder?: string;
  warframe?: string;
  primary?: string;
  secondary?: string;
  melee?: string;
  companion?: string;
  warframeMods?: string[];
  primaryMods?: string[];
  secondaryMods?: string[];
  meleeMods?: string[];
  companionMods?: string[];
  warframeArcanes?: string[];
  primaryArcanes?: string[];
  secondaryArcanes?: string[];
  meleeArcanes?: string[];
  companionArcanes?: string[];
  /** Single item when only one gear piece is provided — auto-classified. */
  itemName?: string;
  mods?: string[];
  arcanes?: string[];
  crystals?: string[];
  notes?: string;
};

export async function composeSavedBuildFromToolArgs(
  args: SaveBuildToolArgs,
): Promise<SavedBuild> {
  let build = createEmptyBuild({
    name: args.name?.trim() || args.itemName?.trim() || "Saved build",
    notes: args.notes?.trim() || undefined,
  });

  const crystals = (args.crystals ?? []).flatMap((c) => parseCrystalEntries(c));
  if (crystals.length) build = { ...build, archonCrystals: crystals };

  const explicit: Array<{
    slot: ArsenalSlotKind;
    name?: string;
    mods?: string[];
    arcanes?: string[];
  }> = [
    {
      slot: "warframe",
      name: args.warframe,
      mods: args.warframeMods,
      arcanes: args.warframeArcanes,
    },
    {
      slot: "primary",
      name: args.primary,
      mods: args.primaryMods,
      arcanes: args.primaryArcanes,
    },
    {
      slot: "secondary",
      name: args.secondary,
      mods: args.secondaryMods,
      arcanes: args.secondaryArcanes,
    },
    {
      slot: "melee",
      name: args.melee,
      mods: args.meleeMods,
      arcanes: args.meleeArcanes,
    },
    {
      slot: "companion",
      name: args.companion,
      mods: args.companionMods,
      arcanes: args.companionArcanes,
    },
  ];

  for (const row of explicit) {
    if (!row.name?.trim()) continue;
    build = applySlot(
      build,
      row.slot,
      row.name.trim(),
      row.mods ?? [],
      row.arcanes ?? [],
    );
  }

  if (args.itemName?.trim()) {
    const classified = await classifyItemName(args.itemName);
    build = applySlot(
      build,
      classified.slot,
      classified.matchedName,
      args.mods ?? [],
      args.arcanes ?? [],
    );
    if (!args.name?.trim()) {
      build = { ...build, name: `${classified.matchedName} build` };
    }
  }

  return { ...build, focusSlot: inferFocusSlot(build) };
}

export async function composeSavedBuildFromParsedLoadout(
  loadout: ParsedLoadout,
  options?: {
    buildName?: string;
    crystals?: string[];
    notes?: string;
  },
): Promise<SavedBuild> {
  const classified = await classifyItemName(loadout.itemName);
  let build = createEmptyBuild({
    name:
      options?.buildName?.trim() ||
      `${classified.matchedName || loadout.itemName} build`,
    notes: options?.notes,
  });
  build = applySlot(
    build,
    classified.slot === "unknown" ? "primary" : classified.slot,
    classified.matchedName || loadout.itemName,
    loadout.mods,
    loadout.arcanes,
  );
  if (options?.crystals?.length) {
    build = {
      ...build,
      archonCrystals: options.crystals.flatMap((c) => parseCrystalEntries(c)),
    };
  }
  // Also scrape crystals from notes / OCR leftovers
  const crystalBlock = [
    ...(loadout.notes ?? []),
    options?.notes ?? "",
  ].join("\n");
  const crystalMatch = crystalBlock.match(
    /(?:archon\s*)?(?:crystal|shard)s?\s*[:\-]\s*([^\n]+)/i,
  );
  if (crystalMatch?.[1] && !build.archonCrystals.length) {
    build = {
      ...build,
      archonCrystals: parseCrystalEntries(crystalMatch[1]),
    };
  }
  return { ...build, focusSlot: inferFocusSlot(build) };
}

/**
 * Heuristic NL parse when no LLM tools are available.
 * Handles forms like:
 *   save a build for Soma Prime
 *   mods: Serration, Vital Sense
 *   arcanes: Primary Merciless
 *   crystals: Crimson Primary Damage
 */
export async function composeSavedBuildFromNaturalLanguage(
  text: string,
): Promise<SavedBuild | null> {
  const raw = text.trim();
  if (!raw || !looksLikeSaveBuildRequest(raw)) return null;

  const nameMatch =
    raw.match(
      /(?:save|add|store)\s+(?:a\s+)?(?:build|loadout)\s+(?:for|called|named)\s+[“"']?([^“"'\n|,]+)/i,
    ) ||
    raw.match(
      /(?:build|loadout)\s+(?:for|called|named)\s+[“"']?([^“"'\n|,]+)/i,
    );

  const itemFromFor = nameMatch?.[1]?.trim();

  const itemLine =
    raw.match(/^(?:item|warframe|weapon|primary|secondary|melee|companion)\s*[:\-]\s*(.+)$/im)?.[1] ||
    itemFromFor;

  const mods =
    raw.match(/(?:^|\n)\s*mods?\s*[:\-]\s*([^\n]+)/i)?.[1] ||
    raw.match(/mods?\s*[:\-]\s*([^\n]+)/i)?.[1];
  const arcanes =
    raw.match(/(?:^|\n)\s*arcanes?\s*[:\-]\s*([^\n]+)/i)?.[1] ||
    raw.match(/arcanes?\s*[:\-]\s*([^\n]+)/i)?.[1];
  const crystals =
    raw.match(
      /(?:^|\n)\s*(?:archon\s*)?(?:crystals?|shards?)\s*[:\-]\s*([^\n]+)/i,
    )?.[1] ||
    raw.match(/(?:archon\s*)?(?:crystals?|shards?)\s*[:\-]\s*([^\n]+)/i)?.[1];

  // Multi-slot keyed lines
  const warframe = raw.match(/(?:^|\n)\s*warframe\s*[:\-]\s*([^\n]+)/i)?.[1];
  const primary = raw.match(/(?:^|\n)\s*primary\s*[:\-]\s*([^\n]+)/i)?.[1];
  const secondary = raw.match(/(?:^|\n)\s*secondary\s*[:\-]\s*([^\n]+)/i)?.[1];
  const melee = raw.match(/(?:^|\n)\s*melee\s*[:\-]\s*([^\n]+)/i)?.[1];
  const companion = raw.match(/(?:^|\n)\s*companion\s*[:\-]\s*([^\n]+)/i)?.[1];

  if (
    !itemLine &&
    !warframe &&
    !primary &&
    !secondary &&
    !melee &&
    !companion
  ) {
    return null;
  }

  return composeSavedBuildFromToolArgs({
    name: itemFromFor ? `${itemFromFor.trim()} build` : undefined,
    itemName: !warframe && !primary && !secondary && !melee && !companion
      ? itemLine?.trim()
      : undefined,
    warframe: warframe?.trim(),
    primary: primary?.trim(),
    secondary: secondary?.trim(),
    melee: melee?.trim(),
    companion: companion?.trim(),
    mods: mods ? splitList(mods) : [],
    arcanes: arcanes ? splitList(arcanes) : [],
    crystals: crystals ? [crystals] : [],
  });
}

export const SAVED_BUILD_MARKER_START = "---SAVED_BUILD---";
export const SAVED_BUILD_MARKER_END = "---END_SAVED_BUILD---";

export function encodeSavedBuildToolResult(
  build: SavedBuild,
  folderName?: string,
): string {
  const payload = {
    build,
    ...(folderName?.trim() ? { folderName: folderName.trim() } : {}),
  };
  return [
    formatBuildSummary(build),
    folderName?.trim() ? `Folder: ${folderName.trim()}` : "",
    "",
    "Slot classification used the local catalog (Warframe / Primary / Secondary / Melee) plus companion name hints.",
    "Confirm briefly for the Operator — the web UI will pin this card into Saved Builds.",
    SAVED_BUILD_MARKER_START,
    JSON.stringify(payload),
    SAVED_BUILD_MARKER_END,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export type SavedBuildToolPayload = {
  build: SavedBuild;
  folderName?: string;
};

export function extractSavedBuildFromToolOutput(
  text: string,
): SavedBuildToolPayload | null {
  const start = text.indexOf(SAVED_BUILD_MARKER_START);
  const end = text.indexOf(SAVED_BUILD_MARKER_END);
  if (start < 0 || end < 0 || end <= start) return null;
  const json = text
    .slice(start + SAVED_BUILD_MARKER_START.length, end)
    .trim();
  try {
    const parsed = JSON.parse(json) as
      | SavedBuild
      | { build: SavedBuild; folderName?: string };
    const buildRaw =
      parsed && typeof parsed === "object" && "build" in parsed
        ? (parsed as { build: SavedBuild }).build
        : (parsed as SavedBuild);
    const folderName =
      parsed && typeof parsed === "object" && "folderName" in parsed
        ? String((parsed as { folderName?: string }).folderName || "")
        : "";
    if (!buildRaw || typeof buildRaw.id !== "string" || typeof buildRaw.name !== "string") {
      return null;
    }
    const build: SavedBuild = {
      ...createEmptyBuild(buildRaw),
      id: buildRaw.id,
      createdAt: Number(buildRaw.createdAt) || Date.now(),
      updatedAt: Number(buildRaw.updatedAt) || Date.now(),
    };
    return {
      build,
      ...(folderName.trim() ? { folderName: folderName.trim() } : {}),
    };
  } catch {
    return null;
  }
}

export function extractSavedBuildFromToolPayloads(
  payloads: string[],
): SavedBuildToolPayload | null {
  for (let i = payloads.length - 1; i >= 0; i -= 1) {
    const hit = extractSavedBuildFromToolOutput(payloads[i] || "");
    if (hit) return hit;
  }
  return null;
}

/** Strip markers so the model-facing tool content stays readable if echoed. */
export function stripSavedBuildMarker(text: string): string {
  const start = text.indexOf(SAVED_BUILD_MARKER_START);
  if (start < 0) return text;
  const end = text.indexOf(SAVED_BUILD_MARKER_END);
  if (end < 0) return text.slice(0, start).trim();
  return `${text.slice(0, start).trim()}\n${text.slice(end + SAVED_BUILD_MARKER_END.length).trim()}`.trim();
}

export { emptyGear };
