"use client";

import type { ChatMemory, Conversation } from "../lib/chat-memory";
import { formatChatTime } from "../lib/chat-memory";
import styles from "./ChatHistoryDrawer.module.css";

export function ChatHistoryDrawer({
  open,
  memory,
  onClose,
  onSelect,
  onNew,
  onDelete,
}: {
  open: boolean;
  memory: ChatMemory;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-label="Chat history"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.label}>Memory</p>
            <h2 className={styles.title}>Transmissions</h2>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close history">
            Close
          </button>
        </div>

        <button type="button" className={styles.newBtn} onClick={onNew}>
          New chat
        </button>

        <ul className={styles.list}>
          {memory.conversations.map((chat) => (
            <HistoryRow
              key={chat.id}
              chat={chat}
              active={chat.id === memory.activeId}
              onSelect={() => onSelect(chat.id)}
              onDelete={() => onDelete(chat.id)}
            />
          ))}
        </ul>

        <p className={styles.footnote}>
          Saved in this browser only (localStorage). Screenshots are not kept in history.
        </p>
      </aside>
    </div>
  );
}

function HistoryRow({
  chat,
  active,
  onSelect,
  onDelete,
}: {
  chat: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`${styles.row} ${active ? styles.rowActive : ""}`}>
      <button type="button" className={styles.rowMain} onClick={onSelect}>
        <span className={styles.rowTitle}>{chat.title}</span>
        <span className={styles.rowMeta}>{formatChatTime(chat.updatedAt)}</span>
      </button>
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={onDelete}
        aria-label={`Delete ${chat.title}`}
        title="Delete chat"
      >
        ×
      </button>
    </li>
  );
}
