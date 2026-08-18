"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  MARKET_QUOTES_STORAGE_KEY,
  type MarketQuotesPayload,
} from "../lib/market-quotes";
import styles from "./MarketQuotePanel.module.css";

type UiState = {
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
};

const MIN_W = 300;
const MIN_H = 220;

function defaultUi(): UiState {
  if (typeof window === "undefined") {
    return { x: 24, y: 72, w: 400, h: 440, minimized: false };
  }
  const mobile = window.innerWidth <= 860;
  const w = mobile
    ? Math.max(MIN_W, window.innerWidth - 16)
    : Math.min(420, Math.max(MIN_W, Math.round(window.innerWidth * 0.32)));
  const h = mobile
    ? Math.min(Math.round(window.innerHeight * 0.72), 560)
    : 440;
  const x = mobile ? 8 : Math.max(16, window.innerWidth - w - 20);
  const y = mobile ? Math.max(12, Math.round(window.innerHeight * 0.1)) : 72;
  return { x, y, w, h, minimized: false };
}

function loadUi(): UiState {
  const fallback = defaultUi();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(MARKET_QUOTES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<UiState>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.w !== "number" ||
      typeof parsed.h !== "number"
    ) {
      return fallback;
    }
    return {
      x: parsed.x,
      y: parsed.y,
      w: Math.max(MIN_W, parsed.w),
      h: Math.max(MIN_H, parsed.h),
      minimized: Boolean(parsed.minimized),
    };
  } catch {
    return fallback;
  }
}

function saveUi(state: UiState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MARKET_QUOTES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function MarketQuotePanel({
  quotes,
  open,
  onClose,
}: {
  quotes: MarketQuotesPayload | null;
  open: boolean;
  onClose: () => void;
}) {
  const [ui, setUi] = useState<UiState>(defaultUi);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const uiRef = useRef(ui);
  const dragRef = useRef<{
    pointerId: number;
    kind: "move" | "resize";
    startX: number;
    startY: number;
    orig: UiState;
  } | null>(null);

  useEffect(() => {
    setUi(loadUi());
  }, []);

  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  useEffect(() => {
    if (!open || !quotes?.quotes.length) return;
    setUi((current) => {
      const next = { ...current, minimized: false };
      saveUi(next);
      return next;
    });
  }, [open, quotes]);

  const updateUi = useCallback((patch: Partial<UiState> | ((prev: UiState) => UiState)) => {
    setUi((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveUi(next);
      return next;
    });
  }, []);

  function onTitlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      kind: "move",
      startX: event.clientX,
      startY: event.clientY,
      orig: uiRef.current,
    };
  }

  function onResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      kind: "resize",
      startX: event.clientX,
      startY: event.clientY,
      orig: uiRef.current,
    };
  }

  function onPointerMove(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.kind === "move") {
      const maxX = Math.max(8, window.innerWidth - 72);
      const maxY = Math.max(8, window.innerHeight - 40);
      setUi({
        ...drag.orig,
        x: Math.min(maxX, Math.max(8, drag.orig.x + dx)),
        y: Math.min(maxY, Math.max(8, drag.orig.y + dy)),
      });
      return;
    }
    const maxW = Math.max(MIN_W, window.innerWidth - drag.orig.x - 8);
    const maxH = Math.max(MIN_H, window.innerHeight - drag.orig.y - 8);
    setUi({
      ...drag.orig,
      w: Math.min(maxW, Math.max(MIN_W, drag.orig.w + dx)),
      h: Math.min(maxH, Math.max(MIN_H, drag.orig.h + dy)),
    });
  }

  function onPointerUp(event: PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    saveUi(uiRef.current);
  }

  async function copyWhisper(key: string, whisper: string) {
    const ok = await copyText(whisper);
    if (ok) {
      setCopyError(null);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1400);
      return;
    }
    setCopyError("Clipboard blocked — use https or localhost, or copy the /w line manually.");
  }

  if (!open || !quotes) return null;

  const rankLabel =
    quotes.maxRank === undefined ? "unranked" : `max rank ${quotes.maxRank}`;

  return (
    <aside
      className={`${styles.panel} ${ui.minimized ? styles.minimized : ""}`}
      style={{
        left: ui.x,
        top: ui.y,
        width: ui.w,
        height: ui.minimized ? undefined : ui.h,
      }}
      role="dialog"
      aria-label="Market Quotes"
    >
      <div
        className={styles.titleBar}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={styles.titleText}>
          <p className={styles.kicker}>Market Quotes</p>
          <h2 className={styles.title}>{quotes.itemName}</h2>
        </div>
        <div className={styles.titleActions}>
          <button
            type="button"
            className={styles.chromeBtn}
            aria-label={ui.minimized ? "Restore market quotes" : "Minimize market quotes"}
            onClick={() => updateUi({ minimized: !ui.minimized })}
          >
            {ui.minimized ? "▢" : "–"}
          </button>
          <button
            type="button"
            className={styles.chromeBtn}
            aria-label="Close market quotes"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      {!ui.minimized ? (
        <>
          <div className={styles.meta}>
            <span>
              {rankLabel}
              {quotes.source === "top" ? " · top-order fallback" : ""}
            </span>
            <a
              className={styles.marketLink}
              href={quotes.url}
              target="_blank"
              rel="noreferrer"
            >
              warframe.market
            </a>
          </div>
          <ul className={styles.rows}>
            {quotes.quotes.map((row, index) => {
              const key = `${row.ign}-${row.platinum}-${index}`;
              const copied = copiedKey === key;
              return (
                <li key={key} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.ign}>{row.ign}</span>
                    <span className={styles.plat}>{row.platinum}p</span>
                    <span className={styles.stat}>×{row.quantity}</span>
                    {row.rank !== undefined ? (
                      <span className={styles.stat}>r{row.rank}</span>
                    ) : null}
                    {row.reputation !== undefined ? (
                      <span className={styles.stat}>rep {row.reputation}</span>
                    ) : null}
                  </div>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => void copyWhisper(key, row.whisper)}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      className={styles.buyBtn}
                      onClick={() => void copyWhisper(key, row.whisper)}
                    >
                      {copied ? "Copied" : "Buy"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className={styles.caveat}>
            Listings move fast. In-game is WFM status, not a guaranteed accept. Paste
            in Recruiting / region chat (needs `/w IGN`). Clipboard needs https or
            localhost.
          </p>
          {copyError ? <p className={styles.copyError}>{copyError}</p> : null}
          <div
            className={styles.resize}
            onPointerDown={onResizePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden="true"
          />
        </>
      ) : null}
    </aside>
  );
}
