/**
 * Bottom-dock prompt chips: contextual follow-ups when useful,
 * otherwise the classic slash-command shortcuts.
 */

export type PromptSuggestion = {
  id: string;
  /** Short chip label */
  label: string;
  /** Full text sent to the chat */
  prompt: string;
  kind: "prompt" | "slash";
};

export type SuggestionMessage = {
  id?: string;
  role: "user" | "assistant" | string;
  content: string;
  toolsUsed?: string[];
};

export const FALLBACK_SLASH_SUGGESTIONS: PromptSuggestion[] = [
  { id: "slash-list", label: "/list", prompt: "/list", kind: "slash" },
  {
    id: "slash-fissures",
    label: "/fissures sp",
    prompt: "/fissures sp",
    kind: "slash",
  },
  { id: "slash-patches", label: "/patches", prompt: "/patches", kind: "slash" },
];

const MAX_CHIPS = 3;

/** Welcome / empty thread — useful starters (replace slash chips). */
const STARTER_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "start-build",
    label: "Steel Path build",
    prompt: "What's a strong Steel Path build to farm right now?",
    kind: "prompt",
  },
  {
    id: "start-sortie",
    label: "Today's sortie",
    prompt: "/sortie",
    kind: "prompt",
  },
  {
    id: "start-patches",
    label: "Latest patches",
    prompt: "What changed in the latest Warframe update?",
    kind: "prompt",
  },
];

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function clipLabel(label: string, max = 28): string {
  const cleaned = normalize(label);
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

/** Pull a likely item/topic from recent user text. */
export function extractTopicHint(text: string): string | null {
  const cleaned = normalize(text);
  if (!cleaned) return null;

  const patterns: RegExp[] = [
    /\/(?:build|farm|dps|knowledge|compare|arcanes|preset)\s+([^/\n]+)$/i,
    /\/market\s+([a-z0-9_]+)/i,
    /(?:build|builds|loadout)\s+(?:for\s+)?([A-Za-z][\w'’\-]+(?:\s+[A-Za-z][\w'’\-]+){0,3})/i,
    /(?:farm|farming|acquire|how (?:do|to) (?:I )?get)\s+([A-Za-z][\w'’\-]+(?:\s+[A-Za-z][\w'’\-]+){0,3})/i,
    /(?:dps|damage)\s+(?:on|for|of)\s+([A-Za-z][\w'’\-]+(?:\s+[A-Za-z][\w'’\-]+){0,3})/i,
    /(?:price|market|plat)\s+(?:for\s+|of\s+)?([A-Za-z][\w'’\-]+(?:\s+[A-Za-z][\w'’\-]+){0,3})/i,
    /(?:compare|vs\.?)\s+([A-Za-z][\w'’\-]+(?:\s+[A-Za-z][\w'’\-]+){0,3})/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;
    const topic = raw
      .replace(/\b(steel path|sp|prime|build|builds|please|today)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (topic.length >= 3 && topic.length <= 40) return topic;
  }
  return null;
}

function slugifyMarketHint(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function isFreshThread(messages: SuggestionMessage[]): boolean {
  const real = messages.filter((m) => m.id !== "welcome" && normalize(m.content));
  return real.length === 0;
}

function lastOfRole(
  messages: SuggestionMessage[],
  role: "user" | "assistant",
): SuggestionMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]!;
    if (m.id === "welcome") continue;
    if (m.role === role && normalize(m.content)) return m;
  }
  return undefined;
}

function pushUnique(
  out: PromptSuggestion[],
  seen: Set<string>,
  suggestion: PromptSuggestion,
): void {
  if (out.length >= MAX_CHIPS) return;
  const key = suggestion.prompt.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push(suggestion);
}

function suggestionsFromTools(
  tools: string[],
  topic: string | null,
): PromptSuggestion[] {
  const out: PromptSuggestion[] = [];
  const seen = new Set<string>();
  const toolSet = new Set(tools);

  const has = (...names: string[]) => names.some((n) => toolSet.has(n));

  if (has("get_fissures", "get_worldstate_summary")) {
    pushUnique(out, seen, {
      id: "follow-sortie",
      label: "Today's sortie",
      prompt: "/sortie",
      kind: "prompt",
    });
    pushUnique(out, seen, {
      id: "follow-cycles",
      label: "Open-world cycles",
      prompt: "/cycles",
      kind: "prompt",
    });
    pushUnique(out, seen, {
      id: "follow-archon",
      label: "Archon hunt",
      prompt: "/archon",
      kind: "prompt",
    });
  }

  if (
    has(
      "lookup_local_builds",
      "lookup_local_knowledge",
      "compare_loadout_to_overframe",
      "search_community_builds",
    )
  ) {
    if (topic) {
      pushUnique(out, seen, {
        id: "follow-dps",
        label: clipLabel(`DPS ${topic}`),
        prompt: `/dps ${topic}`,
        kind: "prompt",
      });
      pushUnique(out, seen, {
        id: "follow-farm",
        label: clipLabel(`Farm ${topic}`),
        prompt: `/farm ${topic}`,
        kind: "prompt",
      });
    } else {
      pushUnique(out, seen, {
        id: "follow-compare",
        label: "Compare my loadout",
        prompt: "Compare my current loadout to top Overframe builds",
        kind: "prompt",
      });
      pushUnique(out, seen, {
        id: "follow-attach",
        label: "Attach a screenshot",
        prompt: "I'll attach a loadout screenshot — compare it to top builds",
        kind: "prompt",
      });
    }
    pushUnique(out, seen, {
      id: "follow-sp-tips",
      label: "Steel Path tips",
      prompt: topic
        ? `Any Steel Path tips for ${topic}?`
        : "Any Steel Path tips for this loadout?",
      kind: "prompt",
    });
  }

  if (has("estimate_modded_dps", "list_dps_presets")) {
    pushUnique(out, seen, {
      id: "follow-preset",
      label: "List DPS presets",
      prompt: "/preset list",
      kind: "prompt",
    });
    if (topic) {
      pushUnique(out, seen, {
        id: "follow-build-topic",
        label: clipLabel(`Builds: ${topic}`),
        prompt: `/build ${topic}`,
        kind: "prompt",
      });
    }
  }

  if (has("get_market_price", "search_market_slug", "get_market_daily_changes")) {
    pushUnique(out, seen, {
      id: "follow-market-day",
      label: "Market daily changes",
      prompt: "/market-changes",
      kind: "prompt",
    });
    if (topic) {
      const slug = slugifyMarketHint(topic);
      if (slug) {
        pushUnique(out, seen, {
          id: "follow-market-item",
          label: clipLabel(`Price ${topic}`),
          prompt: `/market ${slug}`,
          kind: "prompt",
        });
      }
      pushUnique(out, seen, {
        id: "follow-farm-buy",
        label: "Farm vs buy?",
        prompt: `Should I farm or buy ${topic}?`,
        kind: "prompt",
      });
    }
  }

  if (
    has(
      "get_patch_notes_latest",
      "get_patch_notes_detail",
      "get_patch_notes_daily_changes",
    )
  ) {
    pushUnique(out, seen, {
      id: "follow-patch-detail",
      label: "Latest hotfix detail",
      prompt: "/patch latest",
      kind: "prompt",
    });
    pushUnique(out, seen, {
      id: "follow-patch-day",
      label: "Patch daily changes",
      prompt: "/patch-changes",
      kind: "prompt",
    });
    pushUnique(out, seen, {
      id: "follow-baro",
      label: "Baro inventory",
      prompt: "/baro",
      kind: "prompt",
    });
  }

  if (has("lookup_farm_route", "farm_vs_buy")) {
    if (topic) {
      pushUnique(out, seen, {
        id: "follow-build-after-farm",
        label: clipLabel(`Build ${topic}`),
        prompt: `/build ${topic}`,
        kind: "prompt",
      });
      pushUnique(out, seen, {
        id: "follow-market-after-farm",
        label: clipLabel(`Market ${topic}`),
        prompt: `What's the market price for ${topic}?`,
        kind: "prompt",
      });
    }
  }

  return out;
}

function suggestionsFromText(
  haystack: string,
  topic: string | null,
): PromptSuggestion[] {
  const out: PromptSuggestion[] = [];
  const seen = new Set<string>();
  const text = haystack.toLowerCase();

  const mentions = (...words: string[]) => words.some((w) => text.includes(w));

  if (mentions("fissure", "relic", "lith", "meso", "neo", "axi")) {
    pushUnique(out, seen, {
      id: "text-sp-fissures",
      label: "Steel Path fissures",
      prompt: "/fissures sp",
      kind: "prompt",
    });
    pushUnique(out, seen, {
      id: "text-relic",
      label: "Relic rewards",
      prompt: topic ? `/relic ${topic}` : "/relic axi",
      kind: "prompt",
    });
  }

  if (mentions("sortie", "assassination", "rescue", "spy")) {
    pushUnique(out, seen, {
      id: "text-invasions",
      label: "Invasions",
      prompt: "/invasions",
      kind: "prompt",
    });
    pushUnique(out, seen, {
      id: "text-nightwave",
      label: "Nightwave",
      prompt: "/nightwave",
      kind: "prompt",
    });
  }

  if (mentions("build", "mod", "arcane", "loadout", "overframe")) {
    if (topic) {
      pushUnique(out, seen, {
        id: "text-build",
        label: clipLabel(`Top builds: ${topic}`),
        prompt: `/build ${topic}`,
        kind: "prompt",
      });
      pushUnique(out, seen, {
        id: "text-dps",
        label: clipLabel(`DPS ${topic}`),
        prompt: `/dps ${topic}`,
        kind: "prompt",
      });
    } else {
      pushUnique(out, seen, {
        id: "text-compare",
        label: "Compare loadout",
        prompt: "Compare my loadout to the top Overframe builds",
        kind: "prompt",
      });
    }
  }

  if (mentions("market", "platinum", "plat", "ducat", "price")) {
    pushUnique(out, seen, {
      id: "text-market-changes",
      label: "Market daily changes",
      prompt: "/market-changes",
      kind: "prompt",
    });
  }

  if (mentions("patch", "hotfix", "update", "changelog")) {
    pushUnique(out, seen, {
      id: "text-patch",
      label: "Patch detail",
      prompt: "/patch latest",
      kind: "prompt",
    });
  }

  if (mentions("farm", "drop", "acquire", "relic", "blueprint")) {
    if (topic) {
      pushUnique(out, seen, {
        id: "text-farm",
        label: clipLabel(`Farm ${topic}`),
        prompt: `/farm ${topic}`,
        kind: "prompt",
      });
    }
  }

  if (mentions("baro", "void trader")) {
    pushUnique(out, seen, {
      id: "text-baro",
      label: "Baro right now",
      prompt: "/baro",
      kind: "prompt",
    });
  }

  if (mentions("cetus", "fortuna", "deimos", "cycle", "eidolon", "vallis")) {
    pushUnique(out, seen, {
      id: "text-cycles",
      label: "Open-world cycles",
      prompt: "/cycles",
      kind: "prompt",
    });
  }

  return out;
}

/**
 * Contextual follow-up chips when the thread has useful signals;
 * otherwise an empty list (caller should show slash fallbacks).
 */
export function deriveContextualSuggestions(
  messages: SuggestionMessage[],
): PromptSuggestion[] {
  if (isFreshThread(messages)) {
    return STARTER_SUGGESTIONS.slice(0, MAX_CHIPS);
  }

  const lastUser = lastOfRole(messages, "user");
  const lastAssistant = lastOfRole(messages, "assistant");
  const topic =
    extractTopicHint(lastUser?.content ?? "") ||
    extractTopicHint(lastAssistant?.content ?? "");

  const fromTools = suggestionsFromTools(lastAssistant?.toolsUsed ?? [], topic);
  if (fromTools.length > 0) return fromTools.slice(0, MAX_CHIPS);

  const haystack = [lastAssistant?.content ?? "", lastUser?.content ?? ""].join(
    "\n",
  );
  const fromText = suggestionsFromText(haystack, topic);
  return fromText.slice(0, MAX_CHIPS);
}

/**
 * Chips to render beside the toggles: contextual prompts when available,
 * otherwise the default slash-command shortcuts.
 */
export function resolvePromptSuggestions(
  messages: SuggestionMessage[],
): PromptSuggestion[] {
  const contextual = deriveContextualSuggestions(messages);
  return contextual.length > 0 ? contextual : FALLBACK_SLASH_SUGGESTIONS;
}
