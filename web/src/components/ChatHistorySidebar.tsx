"use client";

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
  disabled,
}: {
  memory: ChatMemory;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
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
            />
          ))}
        </ul>

        <p className={styles.footnote}>
          Saved in this browser. Screenshots are not kept in history.
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
}: {
  chat: Conversation;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`${styles.row} ${active ? styles.rowActive : ""}`}>
      <button
        type="button"
        className={styles.rowMain}
        onClick={onSelect}
        disabled={disabled}
      >
        <span className={styles.rowTitle}>{chat.title}</span>
        <span className={styles.rowMeta}>{formatChatTime(chat.updatedAt)}</span>
      </button>
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
    </li>
  );
}
