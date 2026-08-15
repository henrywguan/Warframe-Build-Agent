/** Browser-persisted multi-chat memory (ChatGPT / Open WebUI style). */

export const CHAT_MEMORY_STORAGE_KEY = "wfba_chat_memory_v1";
export const MAX_CONVERSATIONS = 40;
export const MAX_MESSAGES_PER_CHAT = 80;

export type MemoryRole = "user" | "assistant";

export type MemoryMessage = {
  id: string;
  role: MemoryRole;
  content: string;
  toolsUsed?: string[];
};

export type Conversation = {
  id: string;
  title: string;
  /** When true, upserts keep the user-edited title instead of auto-titling. */
  titleCustom?: boolean;
  createdAt: number;
  updatedAt: number;
  messages: MemoryMessage[];
};

export type ChatMemory = {
  version: 1;
  activeId: string;
  conversations: Conversation[];
};

export function newId(prefix = "chat"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromMessages(messages: MemoryMessage[]): string {
  const firstUser = messages.find(
    (m) => m.role === "user" && m.id !== "welcome" && m.content.trim(),
  );
  if (!firstUser) return "New chat";
  const cleaned = firstUser.content.replace(/\s+/g, " ").trim();
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned;
}

/** Drop oversized screenshot payloads; keep text + tool metadata. */
export function toMemoryMessages(
  messages: Array<{
    id: string;
    role: MemoryRole;
    content: string;
    toolsUsed?: string[];
  }>,
): MemoryMessage[] {
  return messages.slice(-MAX_MESSAGES_PER_CHAT).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    ...(m.toolsUsed?.length ? { toolsUsed: m.toolsUsed } : {}),
  }));
}

export function isPlaceholderChat(messages: MemoryMessage[]): boolean {
  const real = messages.filter((m) => m.id !== "welcome");
  return real.length === 0;
}

export function createConversation(
  messages: MemoryMessage[] = [],
  now = Date.now(),
): Conversation {
  return {
    id: newId("chat"),
    title: titleFromMessages(messages),
    createdAt: now,
    updatedAt: now,
    messages,
  };
}

export function emptyMemory(now = Date.now()): ChatMemory {
  const conversation = createConversation([], now);
  return {
    version: 1,
    activeId: conversation.id,
    conversations: [conversation],
  };
}

function sortByUpdated(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadChatMemory(): ChatMemory {
  if (typeof window === "undefined") return emptyMemory();
  try {
    const raw = window.localStorage.getItem(CHAT_MEMORY_STORAGE_KEY);
    if (!raw) return emptyMemory();
    const parsed = JSON.parse(raw) as Partial<ChatMemory>;
    if (parsed.version !== 1 || !Array.isArray(parsed.conversations)) {
      return emptyMemory();
    }
    const conversations = parsed.conversations
      .filter(
        (c): c is Conversation =>
          Boolean(c && typeof c.id === "string" && Array.isArray(c.messages)),
      )
      .map((c) => ({
        id: c.id,
        title: typeof c.title === "string" && c.title.trim() ? c.title : "New chat",
        ...(c.titleCustom ? { titleCustom: true as const } : {}),
        createdAt: Number(c.createdAt) || Date.now(),
        updatedAt: Number(c.updatedAt) || Date.now(),
        messages: toMemoryMessages(c.messages),
      }));
    if (!conversations.length) return emptyMemory();
    const activeId =
      typeof parsed.activeId === "string" &&
      conversations.some((c) => c.id === parsed.activeId)
        ? parsed.activeId
        : conversations[0]!.id;
    return { version: 1, activeId, conversations: sortByUpdated(conversations) };
  } catch {
    return emptyMemory();
  }
}

export function saveChatMemory(memory: ChatMemory): void {
  if (typeof window === "undefined") return;
  const trimmed: ChatMemory = {
    version: 1,
    activeId: memory.activeId,
    conversations: sortByUpdated(memory.conversations)
      .slice(0, MAX_CONVERSATIONS)
      .map((c) => ({
        ...c,
        ...(c.titleCustom ? { titleCustom: true as const } : {}),
        messages: toMemoryMessages(c.messages),
      })),
  };
  try {
    window.localStorage.setItem(CHAT_MEMORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded — drop oldest conversations and retry once.
    const lean: ChatMemory = {
      ...trimmed,
      conversations: trimmed.conversations.slice(0, 12),
    };
    try {
      window.localStorage.setItem(CHAT_MEMORY_STORAGE_KEY, JSON.stringify(lean));
    } catch {
      /* ignore */
    }
  }
}

export function getActiveConversation(memory: ChatMemory): Conversation {
  return (
    memory.conversations.find((c) => c.id === memory.activeId) ??
    memory.conversations[0] ??
    createConversation()
  );
}

export function upsertActiveMessages(
  memory: ChatMemory,
  messages: MemoryMessage[],
): ChatMemory {
  const now = Date.now();
  const active = getActiveConversation(memory);
  const nextActive: Conversation = {
    ...active,
    title: active.titleCustom ? active.title : titleFromMessages(messages),
    updatedAt: now,
    messages: toMemoryMessages(messages),
  };
  const others = memory.conversations.filter((c) => c.id !== active.id);
  return {
    version: 1,
    activeId: nextActive.id,
    conversations: sortByUpdated([nextActive, ...others]),
  };
}

/** Start a new chat; prune other empty placeholders. */
export function startNewChat(memory: ChatMemory): ChatMemory {
  const active = getActiveConversation(memory);
  if (isPlaceholderChat(active.messages)) {
    return memory;
  }
  const fresh = createConversation();
  const kept = memory.conversations.filter(
    (c) => c.id === active.id || !isPlaceholderChat(c.messages),
  );
  return {
    version: 1,
    activeId: fresh.id,
    conversations: sortByUpdated([fresh, ...kept]).slice(0, MAX_CONVERSATIONS),
  };
}

export function selectConversation(memory: ChatMemory, id: string): ChatMemory {
  if (!memory.conversations.some((c) => c.id === id)) return memory;
  return { ...memory, activeId: id };
}

export function deleteConversation(memory: ChatMemory, id: string): ChatMemory {
  const remaining = memory.conversations.filter((c) => c.id !== id);
  if (!remaining.length) return emptyMemory();
  const activeId =
    memory.activeId === id
      ? sortByUpdated(remaining)[0]!.id
      : memory.activeId;
  return {
    version: 1,
    activeId,
    conversations: sortByUpdated(remaining),
  };
}

export function renameConversation(
  memory: ChatMemory,
  id: string,
  title: string,
): ChatMemory {
  const nextTitle = title.replace(/\s+/g, " ").trim().slice(0, 64) || "New chat";
  return {
    ...memory,
    conversations: memory.conversations.map((c) =>
      c.id === id
        ? { ...c, title: nextTitle, titleCustom: true, updatedAt: Date.now() }
        : c,
    ),
  };
}

export function formatChatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}
