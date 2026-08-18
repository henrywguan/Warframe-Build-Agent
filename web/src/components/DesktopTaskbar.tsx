"use client";

import type { ReactNode } from "react";
import styles from "./DesktopTaskbar.module.css";

export type TaskbarAppId = "history" | "builds" | "wfm";

type TaskbarApp = {
  id: TaskbarAppId;
  title: string;
  minimized: boolean;
};

function TransmissionIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.2 3.1h7.4c.7 0 1.2.5 1.2 1.1v4.1c0 .6-.5 1.1-1.2 1.1H6.1L4 11.8V9.4H2.2c-.7 0-1.2-.5-1.2-1.1V4.2c0-.6.5-1.1 1.2-1.1Zm9.2 2.2h1.3c.7 0 1.3.5 1.3 1.2v3.4c0 .6-.6 1.2-1.3 1.2h-1.1v1.8l-1.7-1.8h-.4V8.3c0-1.6 1.1-2.8 2-3Z"
      />
    </svg>
  );
}

function BuildsIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2 14.4 5v6L8 14.8 1.6 11V5L8 1.2Zm0 1.8L3.2 5.6v4.8L8 13l4.8-2.6V5.6L8 3Z"
      />
      <path fill="currentColor" d="M7.2 6.1h1.6v4.2H7.2zM6.1 7.4h3.8v1.3H6.1z" />
    </svg>
  );
}

function WfmIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2 14.4 8 8 14.8 1.6 8 8 1.2Zm0 2.3L4.1 8 8 12.5 11.9 8 8 3.5Z"
      />
      <path fill="currentColor" d="M8 5.4 10.4 8 8 10.6 5.6 8 8 5.4Z" />
    </svg>
  );
}

const ICONS: Record<TaskbarAppId, () => ReactNode> = {
  history: TransmissionIcon,
  builds: BuildsIcon,
  wfm: WfmIcon,
};

function itemToneClass(id: TaskbarAppId): string {
  if (id === "builds") return styles.itemGold;
  if (id === "wfm") return styles.itemSignal;
  return styles.itemPlasma;
}

export function DesktopTaskbar({
  apps,
  selectedId,
  onSelect,
}: {
  apps: TaskbarApp[];
  selectedId: TaskbarAppId | null;
  onSelect: (id: TaskbarAppId) => void;
}) {
  return (
    <nav className={styles.bar} aria-label="Desktop taskbar">
      <p className={styles.kicker}>Orbiter</p>
      <div className={styles.items}>
        {apps.map((app) => {
          const Icon = ICONS[app.id];
          const selected = selectedId === app.id && !app.minimized;
          return (
            <button
              key={app.id}
              type="button"
              className={`${styles.item} ${selected ? styles.itemSelected : ""} ${
                app.minimized ? styles.itemMinimized : ""
              } ${itemToneClass(app.id)}`}
              aria-pressed={selected}
              aria-label={
                app.minimized ? `Restore ${app.title}` : `Show ${app.title}`
              }
              title={
                app.minimized
                  ? `${app.title} (minimized)`
                  : app.title
              }
              onClick={() => onSelect(app.id)}
            >
              <span className={styles.iconWrap}>
                <Icon />
                {app.minimized ? <span className={styles.pip} /> : null}
              </span>
              <span className={styles.label}>{app.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
