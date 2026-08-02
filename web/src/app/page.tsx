"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./page.module.css";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  toolsUsed?: string[];
}

const SUGGESTIONS = [
  "Steel Path fissures right now?",
  "Budget viral slash primary ideas",
  "Latest Warframe hotfix?",
  "Price check mirage_prime_set",
];

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Tenno. Ask for builds, weapon comparisons, live fissures/cycles, market prices, or the latest hotfix. I’ll keep it practical.",
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await fetch("/api/health");
        const auth = await fetch("/api/auth");
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
          content: `I hit a snag: ${message}`,
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
        <header className={styles.brand}>
          <h1 className={styles.brandMark}>
            Warframe <span>Build Agent</span>
          </h1>
          <p className={styles.tagline}>Warming up the relay…</p>
        </header>
      </main>
    );
  }

  if (passwordRequired && !authorized) {
    return (
      <main className={styles.shell}>
        <header className={styles.brand}>
          <h1 className={styles.brandMark}>
            Warframe <span>Build Agent</span>
          </h1>
          <p className={styles.tagline}>
            Private chat lock is on. Enter your access password to continue.
          </p>
        </header>
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
      <header className={styles.brand}>
        <h1 className={styles.brandMark}>
          Warframe <span>Build Agent</span>
        </h1>
        <p className={styles.tagline}>
          Builds, comparisons, live world-state, market, and patch notes — phone-friendly.
        </p>
      </header>

      <section className={styles.chatPanel} aria-label="Chat">
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
            placeholder="Ask about a build, fissures, hotfix, or market slug…"
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
          : "Tip: market slugs look like mirage_prime_set. Patch/market dailies refresh ~4pm Pacific."}
      </p>
    </main>
  );
}
