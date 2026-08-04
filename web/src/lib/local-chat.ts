/**
 * Deterministic local chatbot path — no OpenAI / cloud LLM required.
 * Uses slash commands, local knowledge pack, OCR loadout parse, and Overframe compare.
 */
import {
  hasImages,
  messageImages,
  messageText,
  type IncomingChatMessage,
} from "@/lib/chat-types";
import { isSlashCommand, runSlashCommand } from "@/lib/commands";
import {
  compareLoadoutToTopBuilds,
  formatLoadoutCompare,
  type ParsedLoadout,
} from "@/lib/loadout-compare";
import { ocrImageDataUrl, parseLoadoutFromOcrText } from "@/lib/loadout-parse";
import { lookupLocalKnowledge } from "@/lib/local-knowledge";
import { runOfflineDps } from "@/lib/offline-dps";
import { looksLikeBuildRequest } from "@/lib/source-policy";
import {
  liveCycles,
  liveFissures,
  livePatchNotesLatest,
  liveWorldstateSummary,
} from "@/lib/warframe-live";

export type LocalChatResult = {
  content: string;
  toolsUsed: string[];
  model: "local-knowledge";
};

function extractJsonLoadout(text: string): ParsedLoadout | null {
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

async function handleScreenshotCompare(
  messages: IncomingChatMessage[],
): Promise<LocalChatResult> {
  const latest = [...messages].reverse().find((m) => m.role === "user");
  if (!latest) {
    return {
      content: "No user message to process.",
      toolsUsed: [],
      model: "local-knowledge",
    };
  }
  const text = messageText(latest.content);
  const images = messageImages(latest.content);
  const toolsUsed: string[] = [];
  let loadout = extractJsonLoadout(text);

  if (!loadout && images[0]) {
    toolsUsed.push("ocr_screenshot");
    const ocrText = await ocrImageDataUrl(images[0]);
    loadout = await parseLoadoutFromOcrText(ocrText, text || undefined);
    toolsUsed.push("parse_loadout");
  } else if (!loadout && text.trim()) {
    loadout = await parseLoadoutFromOcrText(text);
    toolsUsed.push("parse_loadout");
  }

  if (!loadout || loadout.itemName === "Unknown") {
    return {
      content: [
        "Local mode could not read a Warframe/weapon name from that screenshot.",
        "Tips:",
        "• Attach a clearer arsenal / modding screen crop",
        "• Or paste: item name + mod list",
        "• Or run a local vision model via OPENAI_BASE_URL (Ollama llava / moondream)",
        loadout?.notes?.length ? `\nNotes: ${loadout.notes.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      toolsUsed,
      model: "local-knowledge",
    };
  }

  toolsUsed.push("compare_loadout_to_overframe");
  const compare = await compareLoadoutToTopBuilds(loadout, 3);
  const body = formatLoadoutCompare(compare);
  const preface = [
    "Local chatbot (no cloud LLM) — screenshot → OCR → top-3 Overframe compare.",
    `Parsed: ${loadout.itemName} · mods ${loadout.mods.length} · arcanes ${loadout.arcanes.length} · confidence ${loadout.confidence ?? "n/a"}`,
    loadout.notes?.length ? `Parse notes: ${loadout.notes.join("; ")}` : "",
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return {
    content: `${preface}${body}`,
    toolsUsed,
    model: "local-knowledge",
  };
}

async function handlePlainLocal(text: string): Promise<LocalChatResult> {
  const toolsUsed: string[] = [];
  const lower = text.toLowerCase();

  const dpsCompare = text.match(
    /^\s*(?:which\s+has\s+higher\s+(?:damage|dps)\s*[,:-]?\s*)?(.+?)\s+(?:vs|versus|or)\s+(.+?)(?:\?|$)/i,
  );
  const dpsPreset = /corrosive/i.test(text)
    ? "rifle-corrosive-heat"
    : /raw|crit/i.test(text)
      ? "rifle-raw-crit"
      : /viral|heat/i.test(text)
        ? "rifle-viral-heat"
        : "typical";

  if (
    dpsCompare ||
    (/\b(dps|damage)\b/i.test(text) && /\b(vs|versus|or)\b/i.test(text))
  ) {
    const left = (dpsCompare?.[1] || "").replace(/\b(dps|damage|higher|better|more)\b/gi, " ").trim();
    const right = (dpsCompare?.[2] || "").replace(/\b(dps|damage|higher|better|more)\b/gi, " ").trim();
    const vsSplit = text.split(/\b(?:vs|versus)\b/i);
    const weapon = left || vsSplit[0]?.replace(/.*\b(?:compare|dps|damage)\b/i, "").trim() || "";
    const weaponB =
      right ||
      vsSplit[1]?.replace(/\b(for|with|under|using).*/i, "").replace(/[?].*$/, "").trim() ||
      "";
    if (weapon && weaponB && weapon.length < 48 && weaponB.length < 48) {
      toolsUsed.push("estimate_modded_dps");
      return {
        content: await runOfflineDps({
          weapon,
          weaponB,
          preset: dpsPreset,
        }),
        toolsUsed,
        model: "local-knowledge",
      };
    }
  }

  // Single-weapon DPS: "what's Coda Hema DPS?" / "Coda Hema damage estimate"
  const singleDps = text.match(
    /^\s*(?:what(?:'?s|\s+is)?|estimate|calc(?:ulate)?|show)?\s*(?:the\s+)?(?:modded\s+)?(?:dps|damage)\s+(?:of|for|on)\s+(.+?)(?:\?|$)/i,
  ) || text.match(
    /^\s*(.+?)\s+(?:modded\s+)?(?:dps|damage(?:\s+estimate)?)\s*\??\s*$/i,
  );
  if (singleDps?.[1] && /\b(dps|damage)\b/i.test(text) && !/\b(vs|versus)\b/i.test(text)) {
    const weapon = singleDps[1]
      .replace(/\b(the|a|an|weapon|rifle|for|of|please)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (weapon && weapon.length >= 2 && weapon.length < 48) {
      toolsUsed.push("estimate_modded_dps");
      return {
        content: await runOfflineDps({ weapon, preset: dpsPreset }),
        toolsUsed,
        model: "local-knowledge",
      };
    }
  }

  if (/\b(fissure|relic|steel path fiss)/i.test(text)) {
    toolsUsed.push("get_fissures");
    return {
      content: await liveFissures({
        steelPathOnly: /\bsp\b|steel/.test(lower),
      }),
      toolsUsed,
      model: "local-knowledge",
    };
  }
  if (/\b(cycle|cetus|vallis|cambion|duviri)\b/i.test(text)) {
    toolsUsed.push("get_cycles");
    return { content: await liveCycles(), toolsUsed, model: "local-knowledge" };
  }
  if (/\b(sortie)\b/i.test(text)) {
    toolsUsed.push("get_worldstate_summary");
    return {
      content: await liveWorldstateSummary(),
      toolsUsed,
      model: "local-knowledge",
    };
  }
  if (/\b(patch|hotfix|update)\b/i.test(text)) {
    toolsUsed.push("get_patch_notes_latest");
    return {
      content: await livePatchNotesLatest(8),
      toolsUsed,
      model: "local-knowledge",
    };
  }

  // Default: local knowledge lookup for item/build questions.
  const query =
    text
      .replace(
        /\b(budget|best|build|compare|for|steel\s*path|sp|loadout|mods?|what|about|tell me)\b/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim() || text;
  toolsUsed.push("lookup_local_knowledge");
  const knowledge = await lookupLocalKnowledge(query);
  const preface = looksLikeBuildRequest(text)
    ? "Local chatbot (no cloud LLM) — answering from the offline knowledge pack + cached Overframe builds.\n\n"
    : "Local chatbot (no cloud LLM) — offline knowledge pack lookup.\n\n";
  return {
    content: `${preface}${knowledge}`,
    toolsUsed,
    model: "local-knowledge",
  };
}

/**
 * Fully local chat resolution. Call when no OpenAI-compatible model is configured,
 * or when CHAT_MODE=local.
 */
export async function runLocalChat(
  messages: IncomingChatMessage[],
): Promise<LocalChatResult> {
  const latest = [...messages].reverse().find((m) => m.role === "user");
  if (!latest) {
    return {
      content: "Send a message or attach a loadout screenshot.",
      toolsUsed: [],
      model: "local-knowledge",
    };
  }

  const text = messageText(latest.content);
  if (text && isSlashCommand(text) && !hasImages([latest])) {
    const slash = await runSlashCommand(text);
    if (slash.handled) {
      return {
        content: slash.content,
        toolsUsed: slash.toolsUsed,
        model: "local-knowledge",
      };
    }
  }

  if (hasImages([latest]) || /\b(compare|screenshot|loadout|my build)\b/i.test(text)) {
    try {
      return await handleScreenshotCompare(messages);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Fall through to text knowledge if OCR fails and we have text.
      if (!text.trim()) {
        return {
          content: `Local screenshot compare failed: ${message}`,
          toolsUsed: ["ocr_screenshot"],
          model: "local-knowledge",
        };
      }
    }
  }

  return handlePlainLocal(text || "status");
}

export function modelConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function preferLocalChat(): boolean {
  const mode = process.env.CHAT_MODE?.trim().toLowerCase();
  if (mode === "local" || mode === "offline") return true;
  if (mode === "model" || mode === "openai") return false;
  return !modelConfigured();
}
