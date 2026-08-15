"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMemory, Conversation } from "../lib/chat-memory";
import { formatChatTime } from "../lib/chat-memory";
import styles from "./ChatHistorySidebar.module.css";

export function ChatHistorySidebar({
  memory,
  mobileOpen,
  onMobileClose,
  onSelect,
  onNew,
  onDelete,
  onRename,
  disabled,
}: {
  memory: ChatMemory;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.rail} data-open={mobileOpen ? "true" : "false"}>
      <div
        className={`${styles.backdrop} ${mobileOpen ? styles.backdropOpen : ""}`}
        role="presentation"
        onClick={onMobileClose}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
        aria-label="Chat history"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.label}>Memory</p>
            <h2 className={styles.title}>Transmissions</h2>
          </div>
          <button
            type="button"
            className={styles.closeMobile}
            onClick={onMobileClose}
            aria-label="Close chat list"
          >
            Close
          </button>
        </div>

        <button
          type="button"
          className={styles.newBtn}
          onClick={onNew}
          disabled={disabled}
        >
          New chat
        </button>

        <ul className={styles.list}>
          {memory.conversations.map((chat) => (
            <HistoryRow
              key={chat.id}
              chat={chat}
              active={chat.id === memory.activeId}
              disabled={disabled}
              onSelect={() => onSelect(chat.id)}
              onDelete={() => onDelete(chat.id)}
              onRename={(title) => onRename(chat.id, title)}
            />
          ))}
        </ul>

        <p className={styles.footnote}>
          Saved in this browser. Screenshots are not kept in history. Double-click
          a title to rename.
        </p>
      </aside>
    </div>
  );
}

function HistoryRow({
  chat,
  active,
  disabled,
  onSelect,
  onDelete,
  onRename,
}: {
  chat: Conversation;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(chat.title);
  }, [chat.title, editing]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function beginEdit() {
    if (disabled) return;
    setDraft(chat.title);
    setEditing(true);
  }

  function commitEdit() {
    if (!editing) return;
    setEditing(false);
    const next = draft.replace(/\s+/g, " ").trim();
    if (!next || next === chat.title) return;
    onRename(next);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(chat.title);
  }

  return (
    <li className={`${styles.row} ${active ? styles.rowActive : ""}`}>
      {editing ? (
        <form
          className={styles.renameForm}
          onSubmit={(event) => {
            event.preventDefault();
            commitEdit();
          }}
        >
          <input
            ref={inputRef}
            className={styles.renameInput}
            value={draft}
            maxLength={64}
            aria-label={`Rename ${chat.title}`}
            disabled={disabled}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
          />
        </form>
      ) : (
        <button
          type="button"
          className={styles.rowMain}
          onClick={onSelect}
          onDoubleClick={(event) => {
            event.preventDefault();
            beginEdit();
          }}
          disabled={disabled}
          title="Open chat — double-click to rename"
        >
          <span className={styles.rowTitle}>{chat.title}</span>
          <span className={styles.rowMeta}>{formatChatTime(chat.updatedAt)}</span>
        </button>
      )}
      <div className={styles.rowActions}>
        {!editing ? (
          <button
            type="button"
            className={styles.renameBtn}
            onClick={beginEdit}
            disabled={disabled}
            aria-label={`Rename ${chat.title}`}
            title="Rename chat"
          >
            ✎
          </button>
        ) : null}
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Delete ${chat.title}`}
          title="Delete chat"
        >
          ×
        </button>
      </div>
    </li>
  );
}
