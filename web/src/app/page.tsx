"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
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
import styles from "./page.module.css";

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

const SUGGESTIONS = ["/list", "/fissures sp", "/patches"];

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Operator? Ordis is online. Attach a loadout screenshot to compare against top Overframe builds, ask in plain language, or type /list. Tap LLM / Ollama to connect a local model without editing .env.",
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

function BrandHeader({ tagline }: { tagline: string }) {
  return (
    <header className={styles.brand}>
      <h1 className={styles.brandMark}>
        Warframe <span>Build Agent</span>
      </h1>
      <hr className={styles.brandRule} />
      <p className={styles.tagline}>{tagline}</p>
    </header>
  );
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
    <div className={styles.topZone}>
      <BrandHeader tagline={tagline} />
      <div className={styles.centerStage}>
        <OrdisStage mood={mood} caption={caption} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const [llmConfig, setLlmConfig] = useState<ClientLlmConfig>(emptyLlmConfig);
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);

  const mood = deriveOrdisMood(pending, speaking);

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
        setLocalMode(Boolean(healthJson.localMode) && !browserLlm);
        if (!healthJson.chatReady && !browserLlm) {
          setError(
            "Chat needs an LLM — tap LLM / Ollama to add a key or Ollama URL, or use CHAT_MODE=local with the knowledge pack.",
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
        }),
      });
      const data = (await response.json()) as {
        message?: ChatMessage;
        toolsUsed?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Chat request failed");
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

  function clearChat() {
    if (pending) return;
    setMessages([{ ...WELCOME_MESSAGE }]);
    setInput("");
    setAttachment(null);
    setError(null);
    setSpeaking(false);
    lastSpokenIdRef.current = null;
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    inputRef.current?.focus();
  }

  const canClearChat = !pending && messages.some((m) => m.id !== "welcome");

  if (!ready) {
    return (
      <main className={styles.shell}>
        <TopZone tagline="Awakening cephalon…" mood="thinking" caption="Initializing…" />
        <div className={styles.chatPanel} aria-hidden="true" />
        <p className={styles.statusLine}>Booting…</p>
      </main>
    );
  }

  if (passwordRequired && !authorized) {
    return (
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
    );
  }

  return (
    <main className={styles.shell}>
      <TopZone
        tagline="Builds, screenshot compares, live world-state, market, and patch notes — Ordis on the line."
        mood={mood}
        caption={ordisCaption(mood)}
      />

      <section className={styles.chatPanel} aria-label="Chat">
        <div className={styles.panelHeader}>
          <p className={styles.panelLabel}>Transmission log</p>
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
            <article className={`${styles.bubble} ${styles.assistant}`}>
              Checking the latest intel…
            </article>
          ) : null}
        </div>

        <div className={styles.suggestions}>
          <button
            type="button"
            className={`${styles.chip} ${llmConfigReady(llmConfig) ? styles.chipActive : ""}`}
            disabled={pending}
            onClick={() => setShowLlmSettings((open) => !open)}
          >
            LLM / Ollama
          </button>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.chip}
              disabled={pending}
              onClick={() => void sendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {showLlmSettings ? (
          <LlmSettingsPanel
            initial={llmConfig}
            onClose={() => setShowLlmSettings(false)}
            onSave={(config) => {
              saveLlmConfig(config);
              setLlmConfig(config);
              const ready = llmConfigReady(config);
              setLocalMode(!ready);
              if (ready) setError(null);
            }}
          />
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
      </section>

      <p className={`${styles.statusLine} ${error ? styles.error : ""}`}>
        {error
          ? error
          : llmConfigReady(llmConfig)
            ? `LLM: ${llmConfig.model || "default"}${llmConfig.baseUrl ? ` @ ${llmConfig.baseUrl}` : ""}`
            : localMode
              ? "Local mode: offline knowledge + OCR compare (no OpenAI key). Tip: LLM / Ollama"
              : "Tip: attach a loadout screenshot, or set LLM / Ollama. /list for commands."}
      </p>
    </main>
  );
}
