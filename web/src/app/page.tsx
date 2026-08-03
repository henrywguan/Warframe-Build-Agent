"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { OrdisStage, type OrdisMood } from "../components/OrdisStage";
import styles from "./page.module.css";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolsUsed?: string[];
}

const SUGGESTIONS = [
  "/list",
  "/fissures sp",
  "/patches",
  "/market mirage_prime_set",
];

const SPEAKING_MS = 3400;

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ordisCaption(mood: OrdisMood): string {
  if (mood === "thinking") return "Consulting the ship’s systems…";
  if (mood === "speaking") return "Ordis is transmitting…";
  return "Operator? Ordis is standing by.";
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

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Operator? Ordis is online. Ask in plain language, or type /list for commands (builds, fissures, market, hotfixes, and more). —Destruction— practical guidance awaits.",
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenIdRef = useRef<string | null>(null);

  const mood: OrdisMood = pending ? "thinking" : speaking ? "speaking" : "idle";

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.id === "welcome" || pending) {
      return;
    }
    triggerSpeaking(last.id);
  }, [messages, pending]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [health, auth] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/auth"),
        ]);
        const healthJson = (await health.json()) as {
          openaiConfigured?: boolean;
        };
        const authJson = (await auth.json()) as { passwordRequired?: boolean };
        if (cancelled) return;
        setPasswordRequired(Boolean(authJson.passwordRequired));
        setAuthorized(!authJson.passwordRequired);
        if (!healthJson.openaiConfigured) {
          setError(
            "Chat backend needs OPENAI_API_KEY in web/.env.local (or your host env).",
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

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    setError(null);
    setSpeaking(false);
    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((m) => m.id !== "welcome")
            .map(({ role, content: value }) => ({ role, content: value })),
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

  if (!ready) {
    return (
      <main className={styles.shell}>
        <BrandHeader tagline="Awakening cephalon…" />
        <div className={styles.centerStage}>
          <OrdisStage mood="thinking" caption="Initializing…" />
        </div>
      </main>
    );
  }

  if (passwordRequired && !authorized) {
    return (
      <main className={styles.shell}>
        <BrandHeader tagline="Cephalon lock engaged. Enter your access password, Operator." />
        <div className={styles.centerStage}>
          <OrdisStage mood="idle" caption="Awaiting clearance…" />
        </div>
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
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <BrandHeader tagline="Builds, comparisons, live world-state, market, and patch notes — Ordis on the line." />

      <div className={styles.centerStage}>
        <OrdisStage mood={mood} caption={ordisCaption(mood)} />
      </div>

      <section className={styles.chatPanel} aria-label="Chat">
        <p className={styles.panelLabel}>Transmission log</p>
        <div className={styles.messages}>
          {messages.map((message) => (
            <article
              key={message.id}
              className={`${styles.bubble} ${
                message.role === "user" ? styles.user : styles.assistant
              }`}
            >
              {message.content}
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
          <div ref={bottomRef} />
        </div>

        <div className={styles.suggestions}>
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

        <form className={styles.composer} onSubmit={onSubmit}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={2}
            placeholder="Try /list, /patches, or ask in plain language…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={pending}
          />
          <button className={styles.send} type="submit" disabled={pending || !input.trim()}>
            Send
          </button>
        </form>
      </section>

      <p className={`${styles.statusLine} ${error ? styles.error : ""}`}>
        {error
          ? error
          : "Tip: type /list for commands. Patch/market dailies refresh ~4pm Pacific."}
      </p>
    </main>
  );
}
