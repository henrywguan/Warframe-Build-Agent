"use client";

import { FormEvent, useState } from "react";
import {
  DEFAULT_OLLAMA,
  type ClientLlmConfig,
  emptyLlmConfig,
  llmConfigReady,
} from "../lib/model-config";
import styles from "../app/page.module.css";

export function LlmSettingsPanel({
  initial,
  onSave,
  onClose,
}: {
  initial: ClientLlmConfig;
  onSave: (config: ClientLlmConfig) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ClientLlmConfig>(initial);
  const [note, setNote] = useState<string | null>(null);

  function update<K extends keyof ClientLlmConfig>(key: K, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    onSave(draft);
    setNote(
      llmConfigReady(draft)
        ? "Saved in this browser. Chat will use these settings."
        : "Cleared key — falling back to server .env / local chatbot.",
    );
  }

  return (
    <form className={styles.llmPanel} onSubmit={save} aria-label="LLM settings">
      <div className={styles.llmHeader}>
        <p className={styles.panelLabel}>LLM / Ollama</p>
        <button type="button" className={styles.clearBtn} onClick={onClose}>
          Close
        </button>
      </div>
      <p className={styles.llmHint}>
        Connect an OpenAI-compatible endpoint from the browser (stored only in localStorage). For
        Ollama, use the preset below.
      </p>
      <label className={styles.llmField}>
        <span>Base URL</span>
        <input
          className={styles.input}
          value={draft.baseUrl}
          placeholder="http://127.0.0.1:11434/v1"
          onChange={(event) => update("baseUrl", event.target.value)}
          autoComplete="off"
        />
      </label>
      <label className={styles.llmField}>
        <span>API key</span>
        <input
          className={styles.input}
          value={draft.apiKey}
          placeholder="ollama or sk-…"
          onChange={(event) => update("apiKey", event.target.value)}
          autoComplete="off"
        />
      </label>
      <label className={styles.llmField}>
        <span>Model</span>
        <input
          className={styles.input}
          value={draft.model}
          placeholder="qwen2.5"
          onChange={(event) => update("model", event.target.value)}
          autoComplete="off"
        />
      </label>
      <label className={styles.llmField}>
        <span>Vision model</span>
        <input
          className={styles.input}
          value={draft.visionModel}
          placeholder="llava (screenshots)"
          onChange={(event) => update("visionModel", event.target.value)}
          autoComplete="off"
        />
      </label>
      <div className={styles.llmActions}>
        <button
          type="button"
          className={styles.chip}
          onClick={() => setDraft({ ...DEFAULT_OLLAMA })}
        >
          Ollama preset
        </button>
        <button
          type="button"
          className={styles.chip}
          onClick={() => {
            setDraft(emptyLlmConfig());
            onSave(emptyLlmConfig());
            setNote("Cleared browser LLM settings.");
          }}
        >
          Clear
        </button>
        <button className={styles.send} type="submit">
          Save
        </button>
      </div>
      {note ? <p className={styles.statusLine}>{note}</p> : null}
    </form>
  );
}
