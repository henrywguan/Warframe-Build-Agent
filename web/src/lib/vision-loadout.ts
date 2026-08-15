/**
 * Screenshot → vision model (no tools) → local Overframe compare.
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

export const LOADOUT_VISION_SYSTEM = `You are Ordis reading a Warframe arsenal / modding screenshot for the Operator.
Describe ONLY what is visible. Do not invent mods.
Return a short plain-text inventory in this shape:

Item: <Warframe or weapon name>
Mods:
- <mod name>
- <mod name>
Arcanes:
- <arcane name>

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
): Promise<{ content: string; toolsUsed: string[]; model: string }> {
  const toolsUsed = ["vision_read_loadout"];
  const loadout =
    extractJsonLoadout(visionText) ||
    (await parseLoadoutFromOcrText(visionText, userHint || undefined));
  toolsUsed.push("parse_loadout");

  if (!loadout || loadout.itemName === "Unknown") {
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
  const promptText =
    userText.trim() ||
    "Read this Warframe loadout screenshot and list the item, mods, and arcanes.";
  parts.push({ type: "text", text: promptText });
  for (const url of images) {
    parts.push({ type: "image_url", image_url: { url } });
  }
  return [
    { role: "system", content: LOADOUT_VISION_SYSTEM },
    {
      role: "user",
      content: parts.length ? parts : promptText,
    },
  ];
}

export function latestTurnHasImages(incoming: IncomingChatMessage[]): boolean {
  return hasImages(incoming);
}
