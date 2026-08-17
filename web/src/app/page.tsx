"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { BrandHeader } from "../components/BrandHeader";
import { OrdisStage } from "../components/OrdisStage";
import { MessageBody } from "../components/MessageBody";
import { LlmSettingsPanel } from "../components/LlmSettingsPanel";
import {
  SPEAKING_MS,
  deriveOrdisMood,
  ordisCaption,
  shouldTriggerSpeaking,
} from "../lib/ordis";
import {
  type ClientLlmConfig,
  emptyLlmConfig,
  llmConfigReady,
  loadLlmConfig,
  saveLlmConfig,
} from "../lib/model-config";
import {
  loadOnlineSearchEnabled,
  saveOnlineSearchEnabled,
} from "../lib/online-search-pref";
import {
  defaultAiChatEnabled,
  loadAiChatPreference,
  saveAiChatEnabled,
} from "../lib/ai-chat-pref";
import {
  type ChatMemory,
  deleteConversation,
  emptyMemory,
  getActiveConversation,
  loadChatMemory,
  renameConversation,
  saveChatMemory,
  selectConversation,
  startNewChat,
  toMemoryMessages,
  upsertActiveMessages,
} from "../lib/chat-memory";
import { ChatHistorySidebar } from "../components/ChatHistorySidebar";
import { SavedBuildsPane } from "../components/SavedBuildsPane";
import { ReplyLoader } from "../components/ReplyLoader";
import {
  type SavedBuildsMemory,
  addBuild,
  applySaveBuildCommand,
  emptySavedBuilds,
  ensureFolderByName,
  isSaveBuildSlash,
  loadSavedBuilds,
  saveBuildUsageHelp,
  saveSavedBuilds,
  stripSaveBuildCommand,
  type SavedBuild,
} from "../lib/saved-builds";
import { resolvePromptSuggestions } from "../lib/prompt-suggestions";
import styles from "./page.module.css";

const VoidField = dynamic(
  () => import("../components/VoidField").then((mod) => mod.VoidField),
  { ssr: false },
);

type Role = "user" | "assistant";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  imageUrl?: string;
  toolsUsed?: string[];
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Operator? Ordis is online. Attach a loadout screenshot, ask in plain language, or type /list. Configure LLM / Ollama for the Warframe advisor; toggle AI for the general research agent. Online search crawls community builds separately.",
};

const MAX_IMAGE_BYTES = 1_600_000;

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  // Downscale large phone screenshots so the chat payload stays reasonable.
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare screenshot for upload.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_IMAGE_BYTES && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}

function TopZone({
  tagline,
  mood,
  caption,
}: {
  tagline: string;
  mood: ReturnType<typeof deriveOrdisMood>;
  caption: string;
}) {
  return (
    <div className={styles.topZone} data-mood={mood}>
      <BrandHeader tagline={tagline} />
      <div className={styles.centerStage}>
        <OrdisStage mood={mood} caption={caption} />
      </div>
    </div>
  );
}

function PageSideGlows({ mood }: { mood: ReturnType<typeof deriveOrdisMood> }) {
  return (
    <div className={styles.pageGlows} data-mood={mood} aria-hidden="true">
      <span className={`${styles.sideGlow} ${styles.sideGlowLeft}`} />
      <span className={`${styles.sideGlow} ${styles.sideGlowRight}`} />
    </div>
  );
}

function withWelcome(messages: ChatMessage[]): ChatMessage[] {
  if (messages.some((m) => m.id === "welcome")) return messages;
  return [{ ...WELCOME_MESSAGE }, ...messages];
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [chatMemory, setChatMemory] = useState<ChatMemory>(() => emptyMemory());
  const [savedBuilds, setSavedBuilds] = useState<SavedBuildsMemory>(() =>
    emptySavedBuilds(),
  );
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [buildFolderFilter, setBuildFolderFilter] = useState<
    "all" | "unfiled" | string
  >("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [buildsOpen, setBuildsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [llmConfig, setLlmConfig] = useState<ClientLlmConfig>(emptyLlmConfig);
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const [onlineSearch, setOnlineSearch] = useState(false);
  const [aiChat, setAiChat] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);
  const memoryHydratedRef = useRef(false);

  const mood = deriveOrdisMood(pending, speaking);
  const promptChips = useMemo(
    () => resolvePromptSuggestions(messages),
    [messages],
  );

  function triggerSpeaking(messageId: string) {
    if (lastSpokenIdRef.current === messageId) return;
    lastSpokenIdRef.current = messageId;
    setSpeaking(true);
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      setSpeaking(false);
      speakTimerRef.current = null;
    }, SPEAKING_MS);
  }

  useEffect(() => {
    triggerSpeaking("welcome");
    return () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const scroller = messagesRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      !last ||
      !shouldTriggerSpeaking({
        role: last.role,
        id: last.id,
        pending,
      })
    ) {
      return;
    }
    triggerSpeaking(last.id);
  }, [messages, pending]);

  useEffect(() => {
    const saved = loadLlmConfig();
    setLlmConfig(saved);
    setOnlineSearch(loadOnlineSearchEnabled());
    const savedAi = loadAiChatPreference();
    setAiChat(savedAi ?? defaultAiChatEnabled());
    const memory = loadChatMemory();
    setChatMemory(memory);
    setSavedBuilds(loadSavedBuilds());
    const active = getActiveConversation(memory);
    setMessages(
      withWelcome(
        active.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolsUsed: m.toolsUsed,
        })),
      ),
    );
    memoryHydratedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const [health, auth] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/auth"),
        ]);
        const healthJson = (await health.json()) as {
          openaiConfigured?: boolean;
          localMode?: boolean;
          chatReady?: boolean;
        };
        const authJson = (await auth.json()) as { passwordRequired?: boolean };
        if (cancelled) return;
        setPasswordRequired(Boolean(authJson.passwordRequired));
        setAuthorized(!authJson.passwordRequired);
        const browserLlm = llmConfigReady(saved);
        const aiOn = savedAi ?? defaultAiChatEnabled();
        setAiChat(aiOn);
        if (!healthJson.chatReady && !browserLlm && aiOn) {
          setError(
            "AI (general agent) needs an LLM — tap LLM / Ollama to add a key or Ollama URL, or turn AI off.",
          );
        }
      } catch {
        if (!cancelled) setError("Could not reach the chat API.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!memoryHydratedRef.current || !ready) return;
    setChatMemory((prev) => {
      const next = upsertActiveMessages(prev, toMemoryMessages(messages));
      saveChatMemory(next);
      return next;
    });
  }, [messages, ready]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("Incorrect password.");
      return;
    }
    setAuthorized(true);
    setPassword("");
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Attach a screenshot image (PNG/JPEG/WebP).");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setAttachment(dataUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function sendMessage(text: string, imageUrl?: string | null) {
    const content = text.trim();
    const image = imageUrl ?? attachment;
    if ((!content && !image) || pending) return;

    setError(null);
    setSpeaking(false);
    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: content || "Compare this loadout screenshot to the top Overframe builds.",
      imageUrl: image || undefined,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setAttachment(null);

    if (!image && content && isSaveBuildSlash(content)) {
      const args = stripSaveBuildCommand(content);
      if (/^(-h|--help|help)$/i.test(args)) {
        setMessages((current) => [
          ...current,
          {
            id: uid(),
            role: "assistant",
            content: saveBuildUsageHelp(),
          },
        ]);
        inputRef.current?.focus();
        return;
      }
      const activeFolder =
        buildFolderFilter === "all" || buildFolderFilter === "unfiled"
          ? null
          : buildFolderFilter;
      const result = applySaveBuildCommand(savedBuilds, args, activeFolder);
      setSavedBuilds(result.memory);
      saveSavedBuilds(result.memory);
      setSelectedBuildId(result.build.id);
      if (result.build.folderId) setBuildFolderFilter(result.build.folderId);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches) {
        setSidebarOpen(false);
        setBuildsOpen(true);
      }
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: result.reply,
          toolsUsed: ["save_build"],
        },
      ]);
      inputRef.current?.focus();
      return;
    }

    setPending(true);

    try {
      const payloadMessages = nextMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => {
          if (!m.imageUrl) {
            return { role: m.role, content: m.content };
          }
          const parts: ContentPart[] = [
            { type: "text", text: m.content },
            { type: "image_url", image_url: { url: m.imageUrl } },
          ];
          return { role: m.role, content: parts };
        });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          llm: llmConfigReady(llmConfig) ? llmConfig : undefined,
          onlineSearch: onlineSearch || undefined,
          aiChat,
        }),
      });
      const data = (await response.json()) as {
        message?: ChatMessage;
        toolsUsed?: string[];
        error?: string;
        savedBuild?: SavedBuild;
        savedBuildFolder?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Chat request failed");
      }

      if (data.savedBuild && typeof data.savedBuild.id === "string") {
        const incoming = data.savedBuild;
        const folderHint = data.savedBuildFolder?.trim();
        let appliedFolderId: string | null = null;
        setSavedBuilds((prev) => {
          let next = prev;
          let folderId: string | null = incoming.folderId ?? null;
          if (folderHint) {
            const ensured = ensureFolderByName(next, folderHint);
            next = ensured.memory;
            folderId = ensured.folderId;
          }
          appliedFolderId = folderId;
          next = addBuild(next, { ...incoming, folderId });
          saveSavedBuilds(next);
          return next;
        });
        setSelectedBuildId(incoming.id);
        if (appliedFolderId) setBuildFolderFilter(appliedFolderId);
        // On phones the Arsenal rail is a drawer — open it after a save.
        if (typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches) {
          setSidebarOpen(false);
          setBuildsOpen(true);
        }
      }

      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: data.message?.content || "No response.",
          toolsUsed: data.toolsUsed,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          content: `I hit a snag, Operator: ${message}`,
        },
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function resetLocalComposer() {
    setInput("");
    setAttachment(null);
    setError(null);
    setSpeaking(false);
    lastSpokenIdRef.current = null;
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
  }

  function clearChat() {
    if (pending) return;
    setMessages([{ ...WELCOME_MESSAGE }]);
    resetLocalComposer();
    inputRef.current?.focus();
  }

  function openNewChat() {
    if (pending) return;
    const next = startNewChat(chatMemory);
    setChatMemory(next);
    saveChatMemory(next);
    setMessages([{ ...WELCOME_MESSAGE }]);
    resetLocalComposer();
    setSidebarOpen(false);
    inputRef.current?.focus();
  }

  function openConversation(id: string) {
    if (pending) return;
    const next = selectConversation(chatMemory, id);
    setChatMemory(next);
    saveChatMemory(next);
    const active = getActiveConversation(next);
    setMessages(
      withWelcome(
        active.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolsUsed: m.toolsUsed,
        })),
      ),
    );
    resetLocalComposer();
    setSidebarOpen(false);
  }

  function removeConversation(id: string) {
    if (pending) return;
    const next = deleteConversation(chatMemory, id);
    setChatMemory(next);
    saveChatMemory(next);
    const active = getActiveConversation(next);
    setMessages(
      withWelcome(
        active.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolsUsed: m.toolsUsed,
        })),
      ),
    );
  }

  function renameChat(id: string, title: string) {
    if (pending) return;
    const next = renameConversation(chatMemory, id, title);
    setChatMemory(next);
    saveChatMemory(next);
  }

  const canClearChat = !pending && messages.some((m) => m.id !== "welcome");

  useEffect(() => {
    if (!sidebarOpen && !buildsOpen && !showLlmSettings) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showLlmSettings) setShowLlmSettings(false);
      else if (buildsOpen) setBuildsOpen(false);
      else if (sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [sidebarOpen, buildsOpen, showLlmSettings]);

  if (!ready) {
    return (
      <>
        <VoidField mood="thinking" />
        <main className={styles.shell}>
          <TopZone tagline="Awakening cephalon…" mood="thinking" caption="Initializing…" />
          <div className={styles.chatPanel} aria-hidden="true" />
          <p className={styles.statusLine}>Booting…</p>
        </main>
      </>
    );
  }

  if (passwordRequired && !authorized) {
    return (
      <>
        <VoidField mood="idle" />
        <main className={styles.shell}>
          <TopZone
            tagline="Cephalon lock engaged. Enter your access password, Operator."
            mood="idle"
            caption="Awaiting clearance…"
          />
          <form className={styles.lock} onSubmit={unlock}>
            <h2>Access</h2>
            <p>Use the CHAT_PASSWORD you configured for this deployment.</p>
            <div className={styles.lockRow}>
              <input
                className={styles.input}
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button className={styles.send} type="submit">
                Enter
              </button>
            </div>
            {error ? <p className={`${styles.statusLine} ${styles.error}`}>{error}</p> : null}
          </form>
          <p className={styles.statusLine} />
        </main>
      </>
    );
  }

  return (
    <>
      <VoidField mood={mood} />
      <PageSideGlows mood={mood} />
      <div className={styles.workspace} data-mood={mood}>
      <ChatHistorySidebar
        memory={chatMemory}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        onSelect={openConversation}
        onNew={openNewChat}
        onDelete={removeConversation}
        onRename={renameChat}
        disabled={pending}
      />
      <main
        className={[
          styles.shell,
          sidebarOpen || buildsOpen ? styles.shellObscured : "",
          showLlmSettings ? styles.shellCrowded : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={sidebarOpen || buildsOpen || undefined}
      >
      <TopZone
        tagline="Builds, compares, world-state, market, and patch notes — Ordis on the line."
        mood={mood}
        caption={ordisCaption(mood)}
      />

      <section className={styles.chatPanel} aria-label="Chat">
        <div className={styles.panelHeader}>
          <div className={styles.headerLead}>
            <button
              type="button"
              className={styles.chatsToggle}
              disabled={pending}
              onClick={() => {
                setBuildsOpen(false);
                setSidebarOpen(true);
              }}
              aria-label="Open chats"
              title="Open chats"
            >
              Chats
            </button>
            <button
              type="button"
              className={styles.buildsToggle}
              disabled={pending}
              onClick={() => {
                setSidebarOpen(false);
                setBuildsOpen(true);
              }}
              aria-label="Open saved builds"
              title="Open saved builds"
            >
              Builds
            </button>
            <p className={styles.panelLabel}>Transmission log</p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.clearBtn}
              disabled={!canClearChat}
              onClick={clearChat}
              aria-label="Clear chat log"
            >
              Clear
            </button>
          </div>
        </div>
        <div className={styles.messages} ref={messagesRef}>
          {messages.map((message) => (
            <article
              key={message.id}
              className={`${styles.bubble} ${
                message.role === "user" ? styles.user : styles.assistant
              }`}
            >
              {message.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.attachPreview}
                  src={message.imageUrl}
                  alt="Attached loadout screenshot"
                />
              ) : null}
              {message.role === "assistant" ? (
                <MessageBody content={message.content} toolsUsed={message.toolsUsed} />
              ) : (
                message.content
              )}
              {message.toolsUsed?.length ? (
                <div className={styles.meta}>Used: {message.toolsUsed.join(", ")}</div>
              ) : null}
            </article>
          ))}
          {pending ? (
            <article
              className={`${styles.bubble} ${styles.assistant} ${styles.pendingBubble}`}
              aria-busy="true"
            >
              <ReplyLoader label="Ordis is consulting…" />
            </article>
          ) : null}
        </div>

        <div
          className={`${styles.panelDock}${showLlmSettings ? ` ${styles.panelDockCrowded}` : ""}`}
        >
          <div className={styles.suggestions}>
            <button
              type="button"
              className={`${styles.chip} ${aiChat ? styles.chipActive : ""}`}
              disabled={pending}
              aria-pressed={aiChat}
              title={
                aiChat
                  ? "AI on — general research agent (non-Warframe-first). Requires LLM / Ollama."
                  : "AI off — keep Warframe LLM advisor when LLM is configured; offline chatbot when not"
              }
              onClick={() => {
                setAiChat((prev) => {
                  const next = !prev;
                  if (next && !llmConfigReady(llmConfig)) {
                    setShowLlmSettings(true);
                    setError(
                      "AI (general agent) needs an LLM — add Ollama/OpenAI in LLM / Ollama, then try again.",
                    );
                    saveAiChatEnabled(false);
                    return false;
                  }
                  saveAiChatEnabled(next);
                  if (next) setError(null);
                  return next;
                });
              }}
            >
              AI {aiChat ? "on" : "off"}
            </button>
            <button
              type="button"
              className={`${styles.chip} ${llmConfigReady(llmConfig) ? styles.chipActive : ""}`}
              disabled={pending}
              title={
                llmConfigReady(llmConfig)
                  ? "LLM configured — Warframe advisor (AI off) or general agent (AI on)"
                  : "Configure Ollama / OpenAI-compatible model (enables LLM mode)"
              }
              onClick={() => setShowLlmSettings((open) => !open)}
            >
              LLM / Ollama
            </button>
            <button
              type="button"
              className={`${styles.chip} ${onlineSearch ? styles.chipActive : ""}`}
              disabled={pending}
              aria-pressed={onlineSearch}
              title={
                onlineSearch
                  ? "Live Overframe + community build crawl is on"
                  : "Turn on to crawl Overframe / community builds when local pack is missing"
              }
              onClick={() => {
                setOnlineSearch((prev) => {
                  const next = !prev;
                  saveOnlineSearchEnabled(next);
                  return next;
                });
              }}
            >
              Online search {onlineSearch ? "on" : "off"}
            </button>
            {promptChips.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className={`${styles.chip}${suggestion.kind === "prompt" ? ` ${styles.chipPrompt}` : ""}`}
                disabled={pending}
                title={suggestion.prompt}
                onClick={() => void sendMessage(suggestion.prompt)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>

          {showLlmSettings ? (
            <div className={styles.dockScroll}>
              <LlmSettingsPanel
                initial={llmConfig}
                onClose={() => setShowLlmSettings(false)}
                onSave={(config) => {
                  saveLlmConfig(config);
                  setLlmConfig(config);
                  // Saving a valid LLM config enables LLM/Warframe-advisor mode.
                  // Do not auto-enable AI (general agent) — that stays an explicit toggle.
                  if (llmConfigReady(config)) {
                    setError(null);
                  }
                }}
              />
            </div>
          ) : null}

        {attachment ? (
          <div className={styles.attachBar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.attachThumb} src={attachment} alt="Pending screenshot" />
            <span>Screenshot ready — send to compare vs top Overframe builds</span>
            <button
              type="button"
              className={styles.attachClear}
              onClick={() => setAttachment(null)}
            >
              Remove
            </button>
          </div>
        ) : null}

        <form className={styles.composer} onSubmit={onSubmit}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className={styles.fileInput}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void onPickFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className={styles.attachBtn}
            disabled={pending}
            aria-label="Attach loadout screenshot"
            title="Attach loadout screenshot"
            onClick={() => fileRef.current?.click()}
          >
            <svg
              className={styles.attachIcon}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M16.5 6.75v8.25a4.5 4.5 0 1 1-9 0V6a3 3 0 1 1 6 0v8.25a1.5 1.5 0 1 1-3 0V7.5h-1.5v6.75a3 3 0 1 0 6 0V6a4.5 4.5 0 1 0-9 0v9a6 6 0 1 0 12 0V6.75H16.5z"
              />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={2}
            placeholder="Ask in plain language, /list, or attach a loadout screenshot…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={pending}
          />
          <button
            className={styles.send}
            type="submit"
            disabled={pending || (!input.trim() && !attachment)}
          >
            Send
          </button>
        </form>
        </div>
      </section>

      <p className={`${styles.statusLine} ${error ? styles.error : ""}`}>
        {error
          ? error
          : llmConfigReady(llmConfig)
            ? `${aiChat ? "AI general agent" : "LLM on (Warframe advisor)"} · ${llmConfig.model || "default"}${llmConfig.baseUrl ? ` @ ${llmConfig.baseUrl}` : ""}${onlineSearch ? " · Online search on" : ""}`
            : aiChat
              ? "AI on — configure LLM / Ollama for the general agent"
              : "Offline knowledge chatbot. Configure LLM / Ollama for the Warframe advisor; toggle AI for general research."}
      </p>
      </main>
      <SavedBuildsPane
        memory={savedBuilds}
        onChange={(next) => {
          setSavedBuilds(next);
          saveSavedBuilds(next);
        }}
        selectedBuildId={selectedBuildId}
        onSelectBuild={setSelectedBuildId}
        filterFolderId={buildFolderFilter}
        onFilterFolder={setBuildFolderFilter}
        mobileOpen={buildsOpen}
        onMobileClose={() => setBuildsOpen(false)}
      />
      </div>
    </>
  );
}
