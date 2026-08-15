/**
 * Screenshot → vision model (no tools) → local Overframe compare or Saved Builds.
 * Used when the configured vision model cannot call OpenAI-style tools
 * (e.g. Ollama gemma3:4b, llava, moondream).
 */
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import {
  hasImages,
  messageImages,
  messageText,
  type IncomingChatMessage,
} from "@/lib/chat-types";
import {
  compareLoadoutToTopBuilds,
  formatLoadoutCompare,
  type ParsedLoadout,
} from "@/lib/loadout-compare";
import { parseLoadoutFromOcrText } from "@/lib/loadout-parse";
import {
  composeSavedBuildFromNaturalLanguage,
  composeSavedBuildFromParsedLoadout,
  looksLikeSaveBuildRequest,
} from "@/lib/save-build-compose";
import type { SavedBuild } from "@/lib/saved-builds";

export const LOADOUT_VISION_SYSTEM = `You are Ordis reading a Warframe arsenal / modding screenshot for the Operator.
Describe ONLY what is visible. Do not invent mods.
Return a short plain-text inventory in this shape:

Item: <Warframe or weapon name>
Mods:
- <mod name>
- <mod name>
Arcanes:
- <arcane name>
Archon crystals (if visible):
- <color + effect>

If a field is unreadable, write Unknown. Prefer exact in-game names.`;

export const LOADOUT_VISION_SAVE_SYSTEM = `You are Ordis reading a Warframe arsenal / modding screenshot so the Operator can SAVE it to their Arsenal pane.
Describe ONLY what is visible. Do not invent mods.
Return a short plain-text inventory in this shape:

Item: <Warframe or weapon name>
Mods:
- <mod name>
Arcanes:
- <arcane name>
Archon crystals:
- <color + effect>

If multiple gear pieces are clearly labeled (Warframe / Primary / Secondary / Melee / Companion), list each:
Warframe: …
Primary: …
Secondary: …
Melee: …
Companion: …

If a field is unreadable, write Unknown. Prefer exact in-game names.`;

export function extractJsonLoadout(text: string): ParsedLoadout | null {
  const match = text.match(/\{[\s\S]*"itemName"[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Partial<ParsedLoadout>;
    if (!parsed.itemName) return null;
    return {
      itemName: String(parsed.itemName),
      mods: Array.isArray(parsed.mods) ? parsed.mods.map(String) : [],
      arcanes: Array.isArray(parsed.arcanes) ? parsed.arcanes.map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function compareFromVisionText(
  visionText: string,
  userHint: string,
  modelLabel: string,
): Promise<{
  content: string;
  toolsUsed: string[];
  model: string;
  savedBuild?: SavedBuild;
  savedBuildFolder?: string;
}> {
  const toolsUsed = ["vision_read_loadout"];
  const wantSave = looksLikeSaveBuildRequest(userHint);
  const loadout =
    extractJsonLoadout(visionText) ||
    (await parseLoadoutFromOcrText(visionText, userHint || undefined));
  toolsUsed.push("parse_loadout");

  if (!loadout || loadout.itemName === "Unknown") {
    if (wantSave) {
      const composed = await composeSavedBuildFromNaturalLanguage(
        `${userHint}\n${visionText}`,
      );
      if (composed) {
        toolsUsed.push("save_build");
        return {
          content: [
            `Vision model **${modelLabel}** saved what it could read into Saved Builds.`,
            "",
            `Card: **${composed.name}**`,
          ].join("\n"),
          toolsUsed,
          model: modelLabel,
          savedBuild: composed,
        };
      }
    }
    return {
      content: [
        `Vision model **${modelLabel}** could not read a clear Warframe/weapon name from that screenshot.`,
        "",
        "Tips:",
        "• Crop to the arsenal / modding panel",
        "• Or paste: item name + mod list",
        "• Or try a stronger vision tag (llava, moondream, or a cloud vision model)",
        "",
        "Vision raw read:",
        visionText.slice(0, 1200) || "(empty)",
        loadout?.notes?.length ? `\nNotes: ${loadout.notes.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      toolsUsed,
      model: modelLabel,
    };
  }

  if (wantSave) {
    toolsUsed.push("save_build");
    const crystalLine = visionText.match(
      /(?:archon\s*)?(?:crystal|shard)s?\s*[:\-]?\s*\n?((?:[-*•].*\n?)+|[^\n]+)/i,
    );
    const savedBuild = await composeSavedBuildFromParsedLoadout(loadout, {
      crystals: crystalLine?.[1]
        ? [crystalLine[1].replace(/^[-*•]\s*/gm, "")]
        : [],
      notes: `Saved from screenshot via ${modelLabel}`,
    });
    const multi = await composeSavedBuildFromNaturalLanguage(
      `save build\n${visionText}`,
    );
    const card =
      multi && (multi.warframe.name || multi.primary.name)
        ? {
            ...savedBuild,
            warframe: multi.warframe.name ? multi.warframe : savedBuild.warframe,
            primary: multi.primary.name ? multi.primary : savedBuild.primary,
            secondary: multi.secondary.name
              ? multi.secondary
              : savedBuild.secondary,
            melee: multi.melee.name ? multi.melee : savedBuild.melee,
            companion: multi.companion.name
              ? multi.companion
              : savedBuild.companion,
            archonCrystals: multi.archonCrystals.length
              ? multi.archonCrystals
              : savedBuild.archonCrystals,
          }
        : savedBuild;

    return {
      content: [
        `Vision model **${modelLabel}** read the screenshot and saved it to your Arsenal pane.`,
        `Parsed: ${loadout.itemName} · mods ${loadout.mods.length} · arcanes ${loadout.arcanes.length}`,
        "",
        `Card: **${card.name}**`,
        card.warframe.name ? `• Warframe: ${card.warframe.name}` : null,
        card.primary.name ? `• Primary: ${card.primary.name}` : null,
        card.secondary.name ? `• Secondary: ${card.secondary.name}` : null,
        card.melee.name ? `• Melee: ${card.melee.name}` : null,
        card.companion.name ? `• Companion: ${card.companion.name}` : null,
      ]
        .filter((line) => line !== null)
        .join("\n"),
      toolsUsed,
      model: modelLabel,
      savedBuild: card,
    };
  }

  toolsUsed.push("compare_loadout_to_overframe");
  const compare = await compareLoadoutToTopBuilds(loadout, 3);
  const body = formatLoadoutCompare(compare);
  const preface = [
    `Vision model **${modelLabel}** read the screenshot (no tool-calling — compared locally).`,
    `Parsed: ${loadout.itemName} · mods ${loadout.mods.length} · arcanes ${loadout.arcanes.length} · confidence ${loadout.confidence ?? "n/a"}`,
    loadout.notes?.length ? `Parse notes: ${loadout.notes.join("; ")}` : "",
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return {
    content: `${preface}${body}`,
    toolsUsed,
    model: modelLabel,
  };
}

/** Build chat messages for a no-tools vision read of the latest screenshot. */
export function buildVisionReadMessages(
  incoming: IncomingChatMessage[],
): ChatCompletionMessageParam[] {
  const latest = [...incoming].reverse().find((m) => m.role === "user");
  const userText = latest ? messageText(latest.content) : "";
  const images = latest ? messageImages(latest.content) : [];
  const parts: ChatCompletionContentPart[] = [];
  const wantSave = looksLikeSaveBuildRequest(userText);
  const promptText =
    userText.trim() ||
    (wantSave
      ? "Read this Warframe loadout screenshot so I can save it — list the item, mods, arcanes, and archon crystals."
      : "Read this Warframe loadout screenshot and list the item, mods, and arcanes.");
  parts.push({ type: "text", text: promptText });
  for (const url of images) {
    parts.push({ type: "image_url", image_url: { url } });
  }
  return [
    {
      role: "system",
      content: wantSave ? LOADOUT_VISION_SAVE_SYSTEM : LOADOUT_VISION_SYSTEM,
    },
    {
      role: "user",
      content: parts.length ? parts : promptText,
    },
  ];
}

export function latestTurnHasImages(incoming: IncomingChatMessage[]): boolean {
  return hasImages(incoming);
}
