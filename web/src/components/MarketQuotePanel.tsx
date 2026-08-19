"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  MARKET_QUOTE_LIMIT,
  MARKET_QUOTES_STORAGE_KEY,
  type MarketQuotesPayload,
  type MarketSlugMatch,
} from "../lib/market-quotes";
import suggestPack from "../data/offline-suggest.json";
import { wfmSuggestDictionary } from "../lib/name-suggest";
import { NameSuggestInput } from "./NameSuggestInput";
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
    return { x: 72, y: 72, w: 400, h: 480, minimized: false };
  }
  const mobile = window.innerWidth <= 860;
  const w = mobile
    ? Math.max(MIN_W, window.innerWidth - 16)
    : Math.min(420, Math.max(MIN_W, Math.round(window.innerWidth * 0.32)));
  const h = mobile
    ? Math.min(Math.round(window.innerHeight * 0.72), 560)
    : 480;
  const x = mobile ? 8 : Math.max(12, Math.round(3.5 * 16) + 18);
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
  minimized,
  onMinimizedChange,
  onClose,
  onQuotes,
}: {
  quotes: MarketQuotesPayload | null;
  open: boolean;
  minimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  onClose: () => void;
  onQuotes?: (quotes: MarketQuotesPayload | null) => void;
}) {
  const [ui, setUi] = useState<UiState>(defaultUi);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [matches, setMatches] = useState<MarketSlugMatch[]>([]);
  const uiRef = useRef(ui);
  const searchRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    kind: "move" | "resize";
    startX: number;
    startY: number;
    orig: UiState;
  } | null>(null);

  const isMinimized = minimized ?? ui.minimized;

  useEffect(() => {
    setUi(loadUi());
  }, []);

  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  useEffect(() => {
    if (!open) return;
    if (quotes?.itemName) setQuery(quotes.itemName);
  }, [open, quotes]);

  useEffect(() => {
    if (minimized === undefined) return;
    setUi((current) => {
      if (current.minimized === minimized) return current;
      const next = { ...current, minimized };
      saveUi(next);
      return next;
    });
  }, [minimized]);

  useEffect(() => {
    if (!open || isMinimized) return;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
      searchRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, isMinimized]);

  const updateUi = useCallback(
    (patch: Partial<UiState> | ((prev: UiState) => UiState)) => {
      setUi((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        saveUi(next);
        return next;
      });
    },
    [],
  );

  function setMinimized(next: boolean) {
    updateUi({ minimized: next });
    // Notify the parent from the click handler, not from the setUi updater.
    // React 19 runs reducers during render; calling HomePage setState there warns.
    onMinimizedChange?.(next);
  }

  async function runSearch(rawQuery: string) {
    const cleaned = rawQuery.trim();
    if (!cleaned || searching) return;
    setSearching(true);
    setStatus(null);
    setCopyError(null);
    setMatches([]);
    try {
      const response = await fetch("/api/market/wfm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleaned }),
      });
      const data = (await response.json()) as {
        content?: string;
        quotes?: MarketQuotesPayload | null;
        matches?: MarketSlugMatch[] | null;
        error?: string;
      };
      if (!response.ok) {
        onQuotes?.(null);
        setStatus(data.error || "Warframe.market lookup failed.");
        return;
      }
      if (data.quotes?.quotes?.length) {
        onQuotes?.(data.quotes);
        setMatches([]);
        setStatus(null);
        setQuery(data.quotes.itemName);
        return;
      }
      onQuotes?.(null);
      if (data.matches?.length) {
        setMatches(data.matches);
        setStatus(data.content || "Several matches — pick a slug.");
        return;
      }
      setStatus(data.content || "No in-game sellers for that item right now.");
    } catch (error) {
      onQuotes?.(null);
      setStatus(error instanceof Error ? error.message : "Warframe.market lookup failed.");
    } finally {
      setSearching(false);
    }
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch(query);
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>, kind: "move" | "resize") {
    if (event.button !== 0) return;
    if (kind === "resize") event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      orig: uiRef.current,
    };
  }

  function onTitlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("form")) return;
    beginDrag(event, "move");
  }

  function onResizePointerDown(event: PointerEvent<HTMLDivElement>) {
    beginDrag(event, "resize");
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

  if (!open) return null;

  const rankLabel =
    quotes?.maxRank === undefined ? "unranked" : `max rank ${quotes.maxRank}`;

  return (
    <aside
      className={`${styles.panel} ${isMinimized ? styles.minimized : ""}`}
      style={{
        left: ui.x,
        top: ui.y,
        width: ui.w,
        height: isMinimized ? undefined : ui.h,
      }}
      role="dialog"
      aria-label="Warframe.market /wfm"
    >
      <div
        className={styles.titleBar}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={styles.titleText}>
          <p className={styles.kicker}>/wfm</p>
          <h2 className={styles.title}>{quotes?.itemName ?? "Warframe.market"}</h2>
        </div>
        <div className={styles.titleActions}>
          <button
            type="button"
            className={styles.chromeBtn}
            aria-label={isMinimized ? "Restore market quotes" : "Minimize market quotes"}
            onClick={() => setMinimized(!isMinimized)}
          >
            {isMinimized ? "▢" : "–"}
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

      {!isMinimized ? (
        <>
          <form className={styles.search} onSubmit={onSearchSubmit}>
            <label className={styles.searchLabel} htmlFor="wfm-item-search">
              Item
            </label>
            <NameSuggestInput
              id="wfm-item-search"
              inputRef={searchRef}
              className={styles.searchInput}
              value={query}
              onChange={setQuery}
              dictionary={wfmSuggestDictionary(suggestPack)}
              placeholder="Primed Continuity, Soma Prime…"
              ariaLabel="Item"
              disabled={searching}
              onPick={(name) => void runSearch(name)}
            />
            <button
              className={styles.searchBtn}
              type="submit"
              disabled={searching || !query.trim()}
            >
              {searching ? "…" : "Search"}
            </button>
          </form>

          {status ? <p className={styles.note}>{status}</p> : null}

          {matches.length ? (
            <ul className={styles.matches}>
              {matches.map((row) => (
                <li key={row.slug}>
                  <button
                    type="button"
                    className={styles.matchBtn}
                    onClick={() => {
                      setQuery(row.slug);
                      void runSearch(row.slug);
                    }}
                    disabled={searching}
                  >
                    <span>{row.name}</span>
                    <code>{row.slug}</code>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {quotes?.quotes.length ? (
            <>
              <div className={styles.meta}>
                <span>
                  {rankLabel}
                  {quotes.source === "top" ? " · top-order fallback" : ""}
                  {` · ${MARKET_QUOTE_LIMIT} cheapest in-game`}
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
            </>
          ) : !status && !matches.length ? (
            <p className={styles.note}>
              Search an item for the {MARKET_QUOTE_LIMIT} cheapest in-game max-rank sellers. Buy
              pastes a `/w` whisper.
            </p>
          ) : null}

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
